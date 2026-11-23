/** Shared test harness: in-memory MongoDB + an app built with injectable fakes. */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from '../../src/config/env.js';
import { createContainer } from '../../src/container.js';
import { createApp } from '../../src/app.js';
import { PNG_BYTES } from './fixtures.js';

let mongoServer;

export async function startMemoryDb() {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}

export async function stopMemoryDb() {
  await mongoose.disconnect();
  await mongoServer?.stop();
}

export async function clearDb() {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

export const FAKE_MODELS = [
  { id: 'bicubic', name: 'Bicubic', kind: 'baseline', scales: [2, 4], available: true },
  {
    id: 'realesrgan-x4plus',
    name: 'Real-ESRGAN x4plus',
    kind: 'ai',
    scales: [2, 4],
    available: false,
    unavailableReason: 'Weights file not found',
  },
];

/** Fake AI client; individual tests override the methods they care about. */
export function createFakeAiClient(overrides = {}) {
  const image = async () => ({ buffer: PNG_BYTES, metrics: { outputWidth: 8, durationMs: 5 } });
  return {
    health: async () => ({ success: true, data: { status: 'ok', device: 'cpu' } }),
    models: async () => ({ models: FAKE_MODELS, runtime: { device: 'cpu', gpu: null } }),
    preview: image,
    enhance: image,
    ...overrides,
  };
}

export function buildTestApp(overrides = {}) {
  const container = createContainer(config, { aiClient: createFakeAiClient(), ...overrides });
  return { app: createApp(container), container };
}
