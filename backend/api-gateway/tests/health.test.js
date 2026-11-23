import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { AppError } from '../src/utils/AppError.js';
import { buildTestApp, createFakeAiClient, startMemoryDb, stopMemoryDb } from './helpers/testApp.js';

describe('Health & core middleware', () => {
  describe('without database', () => {
    it('GET /health/live returns ok', async () => {
      const { app } = buildTestApp();
      const res = await request(app).get('/api/v1/health/live').expect(200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'ok');
    });

    it('GET /health/ready returns 503 when DB is down', async () => {
      const { app } = buildTestApp();
      const res = await request(app).get('/api/v1/health/ready').expect(503);
      assert.equal(res.body.data.dependencies.database, 'down');
    });

    it('unknown routes return a 404 envelope', async () => {
      const { app } = buildTestApp();
      const res = await request(app).get('/api/v1/nope').expect(404);
      assert.deepEqual(Object.keys(res.body), ['success', 'error']);
      assert.equal(res.body.error.code, 'NOT_FOUND');
    });

    it('sets security headers and hides x-powered-by', async () => {
      const { app } = buildTestApp();
      const res = await request(app).get('/api/v1/health/live');
      assert.equal(res.headers['x-powered-by'], undefined);
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
    });

    it('allows the configured CORS origin only', async () => {
      const { app } = buildTestApp();
      const ok = await request(app).get('/api/v1/health/live').set('Origin', 'http://localhost:5173');
      assert.equal(ok.headers['access-control-allow-origin'], 'http://localhost:5173');
      const bad = await request(app).get('/api/v1/health/live').set('Origin', 'http://evil.test');
      assert.equal(bad.headers['access-control-allow-origin'], undefined);
    });

    it('rejects malformed JSON with 400', async () => {
      const { app } = buildTestApp();
      const res = await request(app)
        .post('/api/v1/health/live')
        .set('Content-Type', 'application/json')
        .send('{bad');
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });
  });

  describe('with database', () => {
    before(startMemoryDb);
    after(stopMemoryDb);

    it('reports ok when DB and AI service are up', async () => {
      const { app } = buildTestApp();
      const res = await request(app).get('/api/v1/health/ready').expect(200);
      assert.equal(res.body.data.status, 'ok');
    });

    it('reports degraded when AI service is down', async () => {
      const aiClient = createFakeAiClient({
        health: async () => {
          throw AppError.aiUnavailable();
        },
      });
      const { app } = buildTestApp({ aiClient });
      const res = await request(app).get('/api/v1/health/ready').expect(200);
      assert.equal(res.body.data.status, 'degraded');
      assert.equal(res.body.data.dependencies.aiService, 'down');
    });
  });
});
