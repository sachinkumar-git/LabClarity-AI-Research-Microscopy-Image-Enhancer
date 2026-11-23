import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import { Job } from '../src/models/Job.js';
import { AppError } from '../src/utils/AppError.js';
import { buildTestApp, clearDb, createFakeAiClient, startMemoryDb, stopMemoryDb } from './helpers/testApp.js';
import { PNG_BYTES, TIFF_BYTES } from './helpers/fixtures.js';

describe('Job processing pipeline', () => {
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
      enhance: async ({ model, scale }) => {
        calls.push(`enhance:${model}:${scale}`);
        if (failNext) throw AppError.aiUnavailable('GPU exploded');
        const dataBuffer = scale === 2 ? PNG_BYTES : null; // scale 2 simulates 16-bit output
        return { buffer: PNG_BYTES, dataBuffer, metrics: { outputWidth: 400, durationMs: 12, device: 'cpu' } };
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

  const uploadAndWait = async (buffer, name, model = 'bicubic') => {
    const res = await request(app).post('/api/v1/images').field('model', model).attach('image', buffer, name);
    await container.services.queue.onIdle();
    return res;
  };

  it('lists models with availability', async () => {
    const res = await request(app).get('/api/v1/models').expect(200);
    assert.equal(res.body.data.models.length, 2);
    assert.equal(res.body.data.models[1].available, false);
    assert.equal(res.body.data.runtime.device, 'cpu');
  });

  it('completes a PNG job and serves the enhanced result', async () => {
    const { body } = await uploadAndWait(PNG_BYTES, 'a.png');
    assert.deepEqual(calls, ['enhance:bicubic:4']);
    const job = (await request(app).get(`/api/v1/images/${body.data.id}`)).body.data;
    assert.equal(job.status, 'completed');
    assert.equal(job.metrics.outputWidth, 400);
    const dl = await request(app).get(`${job.links.enhanced}?download=1`).expect(200);
    assert.match(dl.headers['content-disposition'], /a_bicubic_x4\.png/);
  });

  it('generates a browser preview for TIFF inputs', async () => {
    const { body } = await uploadAndWait(TIFF_BYTES, 'cells.tif');
    assert.deepEqual(calls, ['preview', 'enhance:bicubic:4']);
    const job = (await request(app).get(`/api/v1/images/${body.data.id}`)).body.data;
    assert.ok(job.links.preview);
    const preview = await request(app).get(job.links.preview).expect(200);
    assert.equal(preview.headers['content-type'], 'image/png');
  });

  it('exposes a 16-bit data download when the AI returns one', async () => {
    const res = await request(app).post('/api/v1/images').field('model', 'bicubic').field('scale', '2')
      .attach('image', TIFF_BYTES, 'cells.tif');
    await container.services.queue.onIdle();
    const job = (await request(app).get(`/api/v1/images/${res.body.data.id}`)).body.data;
    assert.ok(job.links.enhancedData);
    const dl = await request(app).get(job.links.enhancedData).expect(200);
    assert.match(dl.headers['content-disposition'], /cells_bicubic_x2_16bit.png/);
    const { body } = await uploadAndWait(PNG_BYTES, 'a.png');
    const plain = (await request(app).get(`/api/v1/images/${body.data.id}`)).body.data;
    assert.equal(plain.links.enhancedData, null);
    await request(app).get(`/api/v1/images/${body.data.id}/enhanced-data`).expect(404);
  });

  it('marks the job failed with a safe message when AI fails', async () => {
    failNext = true;
    const { body } = await uploadAndWait(PNG_BYTES, 'a.png');
    const job = (await request(app).get(`/api/v1/images/${body.data.id}`)).body.data;
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
  });

  it('recovers interrupted and waiting jobs on startup', async () => {
    const base = { originalName: 'x.png', mimeType: 'image/png', sizeBytes: 10, model: 'bicubic', scale: 2 };
    const original = await container.services.storage.save('originals', PNG_BYTES, '.png');
    await Job.create({ ...base, status: 'processing', files: { original } });
    const waiting = await Job.create({ ...base, files: { original } });
    await container.services.jobProcessor.recover();
    await container.services.queue.onIdle();
    assert.equal(await Job.countDocuments({ status: 'failed' }), 1);
    assert.equal((await Job.findById(waiting._id)).status, 'completed');
  });

  it('cleanup removes expired jobs', async () => {
    const { body } = await uploadAndWait(PNG_BYTES, 'a.png');
    await Job.updateOne({ publicId: body.data.id }, { expiresAt: new Date(Date.now() - 1000) });
    assert.equal(await container.services.cleanup.runOnce(), 1);
    assert.equal(await Job.countDocuments(), 0);
  });
});
