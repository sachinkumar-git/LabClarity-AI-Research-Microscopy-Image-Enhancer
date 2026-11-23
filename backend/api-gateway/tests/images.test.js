import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import request from 'supertest';
import { Job } from '../src/models/Job.js';
import { buildTestApp, clearDb, startMemoryDb, stopMemoryDb } from './helpers/testApp.js';
import { FAKE_PNG_BYTES, PNG_BYTES, TIFF_BYTES } from './helpers/fixtures.js';

describe('Image job API', () => {
  let app;
  let container;
  const created = [];

  before(async () => {
    await startMemoryDb();
    ({ app, container } = buildTestApp({ onJobCreated: (job) => created.push(job.publicId) }));
    await container.services.onStartup();
  });
  beforeEach(clearDb);
  after(async () => {
    await stopMemoryDb();
    await rm(container.services.storage.root, { recursive: true, force: true });
  });

  const upload = (buffer, name = 'cells.png', fields = { model: 'bicubic' }) => {
    const req = request(app).post('/api/v1/images');
    Object.entries(fields).forEach(([k, v]) => req.field(k, v));
    return req.attach('image', buffer, name);
  };

  it('accepts a valid PNG and returns a queued job (202)', async () => {
    const res = await upload(PNG_BYTES).expect(202);
    assert.equal(res.body.data.status, 'queued');
    assert.equal(res.body.data.scale, 4);
    assert.match(res.headers.location, /\/api\/v1\/images\/[0-9a-f-]{36}$/);
    assert.ok(created.includes(res.body.data.id), 'job handed to the processor hook');
    assert.ok(res.body.data.links.preview, 'PNG originals are previewable');
    assert.equal(res.body.data.links.enhanced, null);
  });

  it('detects TIFF by content and has no preview until processed', async () => {
    const res = await upload(TIFF_BYTES, 'stack.tif', { model: 'bicubic', scale: '2' }).expect(202);
    assert.equal(res.body.data.mimeType, 'image/tiff');
    assert.equal(res.body.data.links.preview, null);
  });

  it('rejects a non-image disguised with a .png extension (415)', async () => {
    const res = await upload(FAKE_PNG_BYTES, 'evil.png').expect(415);
    assert.equal(res.body.error.code, 'UNSUPPORTED_MEDIA_TYPE');
    assert.equal(await Job.countDocuments(), 0);
  });

  it('rejects requests without a file (400)', async () => {
    const res = await request(app).post('/api/v1/images').field('model', 'bicubic').expect(400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('rejects invalid model ids and scales (400)', async () => {
    const res = await upload(PNG_BYTES, 'a.png', { model: '../etc', scale: '3' }).expect(400);
    assert.equal(res.body.error.details.length, 2);
  });

  it('rejects files over the size limit (413)', async () => {
    const big = Buffer.concat([PNG_BYTES, Buffer.alloc(26 * 1024 * 1024)]);
    const res = await upload(big).expect(413);
    assert.equal(res.body.error.code, 'PAYLOAD_TOO_LARGE');
  });

  it('sanitises the stored original filename', async () => {
    const res = await upload(PNG_BYTES, '..\\..\\<script>.png').expect(202);
    assert.equal(res.body.data.originalName, '_script_.png');
  });

  it('fetches a job, streams its original and preview, then deletes it', async () => {
    const { body } = await upload(PNG_BYTES).expect(202);
    const id = body.data.id;

    const show = await request(app).get(`/api/v1/images/${id}`).expect(200);
    assert.equal(show.body.data.id, id);

    const original = await request(app).get(`/api/v1/images/${id}/original`).expect(200);
    assert.equal(original.headers['content-type'], 'image/png');
    assert.match(original.headers['content-disposition'], /attachment/);
    await request(app).get(`/api/v1/images/${id}/preview`).expect(200);
    await request(app).get(`/api/v1/images/${id}/enhanced`).expect(404);

    await request(app).delete(`/api/v1/images/${id}`).expect(204);
    await request(app).get(`/api/v1/images/${id}`).expect(404);
  });

  it('refuses to delete a job that is processing (409)', async () => {
    const { body } = await upload(PNG_BYTES).expect(202);
    await Job.updateOne({ publicId: body.data.id }, { status: 'processing' });
    await request(app).delete(`/api/v1/images/${body.data.id}`).expect(409);
  });

  it('returns 404 for malformed and unknown ids', async () => {
    await request(app).get('/api/v1/images/not-a-uuid').expect(404);
    await request(app).get('/api/v1/images/3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f').expect(404);
  });
});
