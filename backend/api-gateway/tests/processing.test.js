import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import { Asset } from '../src/models/Asset.js';
import { Job } from '../src/models/Job.js';
import { AppError } from '../src/utils/AppError.js';
import { buildTestApp, clearDb, createFakeAiClient, fakeAudit, startMemoryDb, stopMemoryDb } from './helpers/testApp.js';
import { PNG_BYTES, TIFF_BYTES } from './helpers/fixtures.js';

describe('Job processing pipeline (legacy upload API)', () => {
  const calls = [];
  let failNext = false;
  let app;
  let container;

  before(async () => {
    await startMemoryDb();
    const aiClient = createFakeAiClient({
      preview: async () => {
        calls.push('preview');
        return { buffer: PNG_BYTES, metrics: {} };
      },
      process: async ({ pipeline }) => {
        const { model, scale } = pipeline.steps[0];
        calls.push(`process:${model}:${scale}`);
        if (failNext) throw AppError.aiUnavailable('GPU exploded');
        const data = scale === 2 ? PNG_BYTES : null; // scale 2 simulates 16-bit output
        return { audit: fakeAudit(pipeline.steps, { scale }), display: PNG_BYTES, diff: PNG_BYTES, data };
      },
    });
    ({ app, container } = buildTestApp({ aiClient }));
    await container.services.storage.init();
  });
  beforeEach(async () => {
    calls.length = 0;
    failNext = false;
    await clearDb();
  });
  after(async () => {
    await stopMemoryDb();
    await rm(container.services.storage.root, { recursive: true, force: true });
  });

  const uploadAndWait = async (buffer, name, model = 'bicubic', scale = '4') => {
    const res = await request(app).post('/api/v1/images').field('model', model).field('scale', scale).attach('image', buffer, name);
    await container.services.queue.onIdle();
    return res;
  };
  const getJob = async (id) => (await request(app).get(`/api/v1/images/${id}`)).body.data;

  it('lists models, operations and runtime', async () => {
    const res = await request(app).get('/api/v1/models').expect(200);
    assert.equal(res.body.data.models.length, 2);
    assert.equal(res.body.data.models[1].available, false);
    assert.equal(res.body.data.operations[0].op, 'denoise');
    assert.equal(res.body.data.runtime.device, 'cpu');
  });

  it('completes a PNG job with audit, quality and labelled downloads', async () => {
    const { body } = await uploadAndWait(PNG_BYTES, 'a.png');
    assert.deepEqual(calls, ['process:bicubic:4']);
    const job = await getJob(body.data.id);
    assert.equal(job.status, 'completed');
    assert.equal(job.metrics.outputWidth, 256);
    assert.equal(job.quality.consistency.psnr, 38.5);
    assert.match(job.audit.gateway.inputSha256, /^[0-9a-f]{64}$/);
    assert.equal(job.audit.gateway.inputSha256, job.inputSha256);
    const dl = await request(app).get(`${job.links.enhanced}?download=1`).expect(200);
    assert.match(dl.headers['content-disposition'], /a_processed_bicubic_x4\.png/);
    await request(app).get(job.links.diff).expect(200);
  });

  it('generates a browser preview for TIFF inputs at upload time', async () => {
    const { body } = await uploadAndWait(TIFF_BYTES, 'cells.tif');
    assert.deepEqual(calls, ['preview', 'process:bicubic:4']);
    const job = await getJob(body.data.id);
    const preview = await request(app).get(job.links.preview).expect(200);
    assert.equal(preview.headers['content-type'], 'image/png');
  });

  it('exposes a 16-bit data download only when the AI returns one', async () => {
    const res = await uploadAndWait(TIFF_BYTES, 'cells.tif', 'bicubic', '2');
    const job = await getJob(res.body.data.id);
    const dl = await request(app).get(job.links.enhancedData).expect(200);
    assert.match(dl.headers['content-disposition'], /cells_processed_bicubic_x2_16bit\.png/);
    const { body } = await uploadAndWait(PNG_BYTES, 'a.png');
    assert.equal((await getJob(body.data.id)).links.enhancedData, null);
    await request(app).get(`/api/v1/images/${body.data.id}/enhanced-data`).expect(404);
  });

  it('marks the job failed with a safe message when AI fails', async () => {
    failNext = true;
    const { body } = await uploadAndWait(PNG_BYTES, 'a.png');
    const job = await getJob(body.data.id);
    assert.equal(job.status, 'failed');
    assert.equal(job.error, 'GPU exploded');
  });

  it('rejects unknown and unavailable models before storing anything', async () => {
    const unknown = await uploadAndWait(PNG_BYTES, 'a.png', 'nope');
    assert.equal(unknown.status, 400);
    const unavailable = await uploadAndWait(PNG_BYTES, 'a.png', 'realesrgan-x4plus');
    assert.equal(unavailable.status, 422);
    assert.equal(unavailable.body.error.code, 'MODEL_UNAVAILABLE');
    assert.equal(await Job.countDocuments(), 0);
    assert.equal(await Asset.countDocuments(), 0);
  });

  it('recovers interrupted and waiting jobs on startup', async () => {
    const original = await container.services.storage.save('originals', PNG_BYTES, '.png');
    const pipeline = { steps: [{ op: 'super_resolution', model: 'bicubic', scale: 2 }] };
    const base = { originalName: 'x.png', mimeType: 'image/png', sizeBytes: 10, model: 'bicubic', scale: 2, pipeline };
    await Job.create({ ...base, status: 'processing', files: { original } });
    const waiting = await Job.create({ ...base, files: { original } });
    await container.services.jobProcessor.recover();
    await container.services.queue.onIdle();
    assert.equal(await Job.countDocuments({ status: 'failed' }), 1);
    assert.equal((await Job.findById(waiting._id)).status, 'completed');
  });

  it('aborts processing when the original fails its integrity check', async () => {
    const { body } = await uploadAndWait(PNG_BYTES, 'a.png');
    const job = await Job.findOne({ publicId: body.data.id });
    await Job.create({ ...job.toObject(), _id: undefined, publicId: undefined, status: 'queued', inputSha256: 'f'.repeat(64) });
    await container.services.jobProcessor.recover();
    await container.services.queue.onIdle();
    const tampered = await Job.findOne({ inputSha256: 'f'.repeat(64) });
    assert.equal(tampered.status, 'failed');
    assert.match(tampered.errorMessage, /integrity/);
  });

  it('cleanup removes expired ad-hoc images together with their runs', async () => {
    const { body } = await uploadAndWait(PNG_BYTES, 'a.png');
    assert.ok(body.data.expiresAt, 'ad-hoc uploads expire');
    await Asset.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
    assert.equal(await container.services.cleanup.runOnce(), 1);
    assert.equal(await Job.countDocuments(), 0);
    assert.equal(await Asset.countDocuments(), 0);
  });
});
