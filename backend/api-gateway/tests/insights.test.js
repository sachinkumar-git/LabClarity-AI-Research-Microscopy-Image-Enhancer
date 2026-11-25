import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import { Job } from '../src/models/Job.js';
import { safeText } from '../src/services/reports/pdfLayout.js';
import { buildTestApp, clearDb, createFakeAiClient, fakeAudit, startMemoryDb, stopMemoryDb } from './helpers/testApp.js';
import { realPng } from './helpers/fixtures.js';

const pageCount = (pdf) => (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;
const binaryParser = (res, cb) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c)).on('end', () => cb(null, Buffer.concat(chunks)));
};

describe('Reports and dashboard statistics', () => {
  let app;
  let container;
  const png = realPng(16);

  before(async () => {
    await startMemoryDb();
    const aiClient = createFakeAiClient({
      preview: async () => ({ buffer: png, metrics: {} }),
      process: async ({ pipeline }) => {
        const sr = pipeline.steps.find((s) => s.op === 'super_resolution');
        return { audit: fakeAudit(pipeline.steps, { scale: sr?.scale ?? 1 }), display: png, diff: png, data: null };
      },
    });
    ({ app, container } = buildTestApp({ aiClient }));
    await container.services.storage.init();
  });
  beforeEach(clearDb);
  after(async () => {
    await stopMemoryDb();
    await rm(container.services.storage.root, { recursive: true, force: true });
  });

  async function seedComparison(experimentId) {
    const req = request(app).post('/api/v1/assets');
    if (experimentId) req.field('experimentId', experimentId);
    const [asset] = (await req.attach('images', png, 'cells.png')).body.data;
    const pipelines = [
      { steps: [{ op: 'super_resolution', model: 'bicubic', scale: 2 }] },
      { label: 'Denoise → SR ×4', steps: [{ op: 'denoise' }, { op: 'super_resolution', model: 'bicubic', scale: 4 }] },
    ];
    const run = await request(app).post('/api/v1/runs').send({ assetIds: [asset.id], pipelines });
    await container.services.queue.onIdle();
    return run.body.data;
  }

  it('produces a single-run PDF report with embedded images', async () => {
    const batch = await seedComparison();
    const res = await request(app).get(`/api/v1/reports/jobs/${batch.jobs[0].id}`).buffer(true).parse(binaryParser).expect(200);
    assert.equal(res.headers['content-type'], 'application/pdf');
    assert.match(res.headers['content-disposition'], /labclarity-run-.*\.pdf/);
    assert.equal(res.body.subarray(0, 5).toString(), '%PDF-');
    assert.ok(res.body.toString('latin1').includes('/Subtype /Image'), 'images embedded');
  });

  it('produces batch and experiment reports with a summary page plus one page per run', async () => {
    const exp = (await request(app).post('/api/v1/experiments').send({ name: 'Report test' })).body.data;
    const batch = await seedComparison(exp.id);
    const batchPdf = await request(app).get(batch.links.report).buffer(true).parse(binaryParser).expect(200);
    assert.ok(pageCount(batchPdf.body) >= 3);
    const expPdf = await request(app).get(exp.links.report).buffer(true).parse(binaryParser).expect(200);
    assert.ok(pageCount(expPdf.body) >= 3);
  });

  it('reports on failed runs and returns 404 for unknown or empty targets', async () => {
    const batch = await seedComparison();
    await Job.updateOne({ publicId: batch.jobs[0].id }, { status: 'failed', errorMessage: 'GPU out of memory' });
    await request(app).get(`/api/v1/reports/jobs/${batch.jobs[0].id}`).expect(200);
    await request(app).get('/api/v1/reports/jobs/3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f').expect(404);
    const empty = (await request(app).post('/api/v1/experiments').send({ name: 'Empty' })).body.data;
    await request(app).get(empty.links.report).expect(404);
  });

  it('computes dashboard statistics', async () => {
    await seedComparison();
    await Job.updateOne({}, { status: 'failed' });
    const stats = (await request(app).get('/api/v1/stats').expect(200)).body.data;
    assert.equal(stats.totals.runs, 2);
    assert.equal(stats.totals.images, 1);
    assert.equal(stats.successRate, 0.5);
    assert.equal(stats.byModel[0].model, 'bicubic');
    assert.equal(stats.byModel[0].avgPsnr, 38.5);
    assert.equal(stats.byModel[0].avgNoiseReduction, 0.03);
    assert.deepEqual(stats.operations.map((o) => o.op).sort(), ['denoise', 'super_resolution']);
    assert.equal(stats.timeline.length, 14);
    assert.equal(stats.timeline.at(-1).runs, 2);
    assert.equal(stats.devices[0].device, 'cpu');
    assert.equal(stats.recent.length, 2);
  });

  it('maps symbols the built-in PDF font cannot encode', () => {
    assert.equal(safeText('Denoise → SR ×4, σ=0.02'), 'Denoise -> SR x4, sigma=0.02');
    assert.equal(safeText(null), '—');
  });
});
