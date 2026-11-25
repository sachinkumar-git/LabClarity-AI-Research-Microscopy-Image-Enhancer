import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, rm, stat, writeFile } from 'node:fs/promises';
import request from 'supertest';
import { Asset } from '../src/models/Asset.js';
import { Job } from '../src/models/Job.js';
import { buildTestApp, clearDb, startMemoryDb, stopMemoryDb } from './helpers/testApp.js';
import { FAKE_PNG_BYTES, PNG_BYTES, TIFF_BYTES } from './helpers/fixtures.js';

const SR = { op: 'super_resolution', model: 'bicubic', scale: 2 };

describe('Research workspace API', () => {
  let app;
  let container;

  before(async () => {
    await startMemoryDb();
    ({ app, container } = buildTestApp());
    await container.services.storage.init();
  });
  beforeEach(clearDb);
  after(async () => {
    await stopMemoryDb();
    await rm(container.services.storage.root, { recursive: true, force: true });
  });

  const api = () => request(app);
  const createExperiment = async (name = 'Mito imaging') =>
    (await api().post('/api/v1/experiments').send({ name, tags: ['confocal'] }).expect(201)).body.data;
  const uploadAssets = (files, experimentId) => {
    const req = api().post('/api/v1/assets');
    if (experimentId) req.field('experimentId', experimentId);
    files.forEach(([buf, name]) => req.attach('images', buf, name));
    return req;
  };
  const runAndWait = async (body) => {
    const res = await api().post('/api/v1/runs').send(body);
    await container.services.queue.onIdle();
    return res;
  };

  it('creates, lists, updates and validates experiments', async () => {
    const exp = await createExperiment();
    assert.equal(exp.imageCount, 0);
    await api().patch(`/api/v1/experiments/${exp.id}`).send({ description: 'z-stack, 63x' }).expect(200);
    const list = (await api().get('/api/v1/experiments').expect(200)).body.data;
    assert.equal(list[0].description, 'z-stack, 63x');
    const bad = await api().post('/api/v1/experiments').send({ name: '', tags: Array(11).fill('t') }).expect(400);
    assert.equal(bad.body.error.details.length, 2);
  });

  it('batch-uploads images with analysis, fingerprints and write-protected originals', async () => {
    const exp = await createExperiment();
    const res = await uploadAssets([[PNG_BYTES, 'a.png'], [TIFF_BYTES, 'b.tif']], exp.id).expect(201);
    assert.equal(res.body.data.length, 2);
    const [png, tif] = res.body.data;
    assert.match(png.sha256, /^[0-9a-f]{64}$/);
    assert.equal(png.analysis.noiseSigma, 0.04);
    assert.equal(png.recommendation.steps[0].op, 'denoise');
    assert.equal(png.expiresAt, null, 'experiment data is retained');
    assert.ok(tif.links.preview);
    const asset = await Asset.findOne({ publicId: png.id });
    const mode = (await stat(container.services.storage.pathFor(asset.files.original))).mode;
    assert.equal(mode & 0o222, 0, 'original is read-only');
  });

  it('rejects disguised files and unknown experiments', async () => {
    assert.equal((await uploadAssets([[FAKE_PNG_BYTES, 'x.png']])).status, 415);
    assert.equal((await uploadAssets([[PNG_BYTES, 'x.png']], '3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f')).status, 404);
  });

  it('verifies integrity and detects a tampered original', async () => {
    const [asset] = (await uploadAssets([[PNG_BYTES, 'a.png']])).body.data;
    const ok = (await api().get(`/api/v1/assets/${asset.id}/verify`).expect(200)).body.data;
    assert.equal(ok.intact, true);
    const doc = await Asset.findOne({ publicId: asset.id });
    const file = container.services.storage.pathFor(doc.files.original);
    await chmod(file, 0o644);
    await writeFile(file, Buffer.concat([PNG_BYTES, Buffer.from('x')]));
    assert.equal((await api().get(`/api/v1/assets/${asset.id}/verify`)).body.data.intact, false);
  });

  it('runs a multi-model comparison (1 image x N pipelines) with batch progress', async () => {
    const [asset] = (await uploadAssets([[PNG_BYTES, 'a.png']])).body.data;
    const pipelines = [{ steps: [SR] }, { label: 'Denoise + SR', steps: [{ op: 'denoise' }, SR] }];
    const res = await runAndWait({ assetIds: [asset.id], pipelines });
    assert.equal(res.status, 202);
    assert.equal(res.body.data.total, 2);
    const batch = (await api().get(res.body.data.links.self).expect(200)).body.data;
    assert.equal(batch.done, true);
    assert.equal(batch.percent, 100);
    assert.deepEqual(batch.jobs.map((j) => j.label), ['SR bicubic ×2', 'Denoise + SR']);
    assert.ok(batch.jobs.every((j) => j.quality.consistency.ssim === 0.97));
  });

  it('runs a batch (N images x 1 pipeline) with ROI and reference image', async () => {
    const assets = (await uploadAssets([[PNG_BYTES, 'a.png'], [PNG_BYTES, 'b.png']])).body.data;
    const roi = { x: 4, y: 4, width: 32, height: 24 };
    const res = await runAndWait({ assetIds: assets.map((a) => a.id), pipelines: [{ steps: [SR] }], roi, referenceAssetId: assets[0].id });
    const jobs = res.body.data.jobs;
    assert.equal(jobs.length, 2);
    const detail = (await api().get(`/api/v1/jobs/${jobs[0].id}`).expect(200)).body.data;
    assert.deepEqual(detail.roi, roi);
    assert.equal(detail.metrics.outputWidth, 64);
    assert.equal(detail.referenceAssetId, assets[0].id);
  });

  it('validates runs before queuing anything', async () => {
    const [asset] = (await uploadAssets([[PNG_BYTES, 'a.png']])).body.data;
    const send = (body) => api().post('/api/v1/runs').send(body);
    assert.equal((await send({ assetIds: ['nope'], pipelines: [] })).status, 400);
    assert.equal((await send({ assetIds: [asset.id], pipelines: [{ steps: [SR] }], roi: { x: 60, y: 0, width: 16, height: 16 } })).status, 400);
    const unavailable = await send({ assetIds: [asset.id], pipelines: [{ steps: [{ ...SR, model: 'realesrgan-x4plus' }] }] });
    assert.equal(unavailable.body.error.code, 'MODEL_UNAVAILABLE');
    assert.equal((await send({ assetIds: ['3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f'], pipelines: [{ steps: [SR] }] })).status, 404);
    assert.equal(await Job.countDocuments(), 0);
  });

  it('lists run history with filters and shows experiment detail', async () => {
    const exp = await createExperiment();
    const [asset] = (await uploadAssets([[PNG_BYTES, 'a.png']], exp.id)).body.data;
    await runAndWait({ assetIds: [asset.id], pipelines: [{ steps: [SR] }, { steps: [{ op: 'denoise' }] }] });
    const history = await api().get(`/api/v1/jobs?experimentId=${exp.id}&limit=1`).expect(200);
    assert.equal(history.body.meta.total, 2);
    assert.equal(history.body.data.length, 1);
    await api().get('/api/v1/jobs?status=bogus').expect(400);
    const detail = (await api().get(`/api/v1/experiments/${exp.id}`)).body.data;
    assert.equal(detail.imageCount, 1);
    assert.equal(detail.runCount, 2);
    assert.ok(detail.runs.every((r) => r.expiresAt === null));
  });

  it('deleting an experiment cascades to images, runs and files', async () => {
    const exp = await createExperiment();
    const [asset] = (await uploadAssets([[PNG_BYTES, 'a.png']], exp.id)).body.data;
    await runAndWait({ assetIds: [asset.id], pipelines: [{ steps: [SR] }] });
    await api().delete(`/api/v1/experiments/${exp.id}`).expect(204);
    assert.equal(await Asset.countDocuments(), 0);
    assert.equal(await Job.countDocuments(), 0);
    await api().get(`/api/v1/experiments/${exp.id}`).expect(404);
  });
});
