import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import { Job } from '../src/models/Job.js';
import { AppError } from '../src/utils/AppError.js';
import { buildTestApp, clearDb, createFakeAiClient, fakeAudit, startMemoryDb, stopMemoryDb } from './helpers/testApp.js';
import { PNG_BYTES } from './helpers/fixtures.js';

const SR = { op: 'super_resolution', model: 'bicubic', scale: 2 };

describe('Batch controls (retry / cancel) and stats ranges', () => {
  let failing = true;
  let app;
  let container;

  before(async () => {
    await startMemoryDb();
    const aiClient = createFakeAiClient({
      process: async ({ pipeline }) => {
        if (failing) throw AppError.aiUnavailable('GPU out of memory');
        return { audit: fakeAudit(pipeline.steps, { scale: 2 }), display: PNG_BYTES, diff: PNG_BYTES, data: null };
      },
    });
    ({ app, container } = buildTestApp({ aiClient }));
    await container.services.storage.init();
  });
  beforeEach(async () => {
    failing = true;
    await clearDb();
  });
  after(async () => {
    await stopMemoryDb();
    await rm(container.services.storage.root, { recursive: true, force: true });
  });

  async function failedBatch() {
    const [asset] = (await request(app).post('/api/v1/assets').attach('images', PNG_BYTES, 'a.png')).body.data;
    const run = await request(app).post('/api/v1/runs').send({ assetIds: [asset.id], pipelines: [{ steps: [SR] }, { steps: [{ op: 'denoise' }] }] });
    await container.services.queue.onIdle();
    return run.body.data;
  }

  it('retries every failed run in a batch', async () => {
    const batch = await failedBatch();
    assert.equal(await Job.countDocuments({ status: 'failed' }), 2);
    failing = false;
    const res = await request(app).post(`/api/v1/batches/${batch.id}/retry`).expect(200);
    assert.equal(res.body.data.retried, 2);
    await container.services.queue.onIdle();
    const after = (await request(app).get(`/api/v1/batches/${batch.id}`)).body.data;
    assert.equal(after.counts.completed, 2);
    assert.ok(after.jobs.every((j) => j.error === null));
  });

  it('retries a single failed run and refuses to retry completed ones', async () => {
    const batch = await failedBatch();
    failing = false;
    const id = batch.jobs[0].id;
    await request(app).post(`/api/v1/jobs/${id}/retry`).expect(200);
    await container.services.queue.onIdle();
    assert.equal((await Job.findOne({ publicId: id })).status, 'completed');
    const again = await request(app).post(`/api/v1/jobs/${id}/retry`).expect(409);
    assert.equal(again.body.error.code, 'CONFLICT');
  });

  it('cancels queued runs and reports runs that are still processing', async () => {
    const batch = await failedBatch();
    await Job.updateOne({ publicId: batch.jobs[0].id }, { status: 'queued' });
    await Job.updateOne({ publicId: batch.jobs[1].id }, { status: 'processing' });
    const res = await request(app).post(`/api/v1/batches/${batch.id}/cancel`).expect(200);
    assert.equal(res.body.data.cancelled, 1);
    assert.equal(res.body.data.stillRunning, 1);
    assert.equal((await Job.findOne({ publicId: batch.jobs[0].id })).errorMessage, 'Cancelled by user');
  });

  it('returns 404 for unknown batches', async () => {
    await request(app).post('/api/v1/batches/3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f/retry').expect(404);
    await request(app).post('/api/v1/batches/3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f/cancel').expect(404);
  });

  it('supports 7/14/30-day stats ranges and overall averages', async () => {
    failing = false;
    await failedBatch();
    const week = (await request(app).get('/api/v1/stats?days=7').expect(200)).body.data;
    assert.equal(week.timeline.length, 7);
    assert.equal(week.days, 7);
    assert.equal(week.avgDurationMs, 12);
    assert.equal(week.modelsUsed, 2);
    const fallback = (await request(app).get('/api/v1/stats?days=9999').expect(200)).body.data;
    assert.equal(fallback.timeline.length, 14);
  });
});
