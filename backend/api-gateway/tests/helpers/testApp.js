/** Shared test harness: in-memory MongoDB + an app built with injectable fakes. */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from '../../src/config/env.js';
import { createContainer } from '../../src/container.js';
import { createApp } from '../../src/app.js';
import { AppError } from '../../src/utils/AppError.js';
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
  { id: 'bicubic', name: 'Bicubic', kind: 'baseline', task: 'super_resolution', scales: [2, 4], available: true },
  {
    id: 'realesrgan-x4plus',
    name: 'Real-ESRGAN x4plus',
    kind: 'ai',
    task: 'super_resolution',
    scales: [2, 4],
    available: false,
    unavailableReason: 'Weights file not found',
  },
];

export const FAKE_ANALYSIS = {
  analysis: { width: 64, height: 48, channels: 1, bitDepth: 8, noiseSigma: 0.04, sharpness: 0.01 },
  recommendation: { steps: [{ op: 'denoise', method: 'nlm' }], reasons: [], warnings: [] },
};

export function fakeAudit(steps = [], { width = 64, height = 48, scale = 1, roi = null } = {}) {
  return {
    timestamp: new Date().toISOString(),
    device: 'cpu',
    input: { width, height, roi },
    steps: steps.map((s, index) => ({ index, op: s.op, params: s, model: s.model ? { id: s.model } : null })),
    output: { width: (roi?.width ?? width) * scale, height: (roi?.height ?? height) * scale, dataBitDepth: 8 },
    quality: { consistency: { psnr: 38.5, ssim: 0.97 }, noReference: { input: { noiseSigma: 0.04 }, output: { noiseSigma: 0.01 } } },
    durationMs: 12,
  };
}

/** Mimics the AI service's validator: checks model availability and computes the scale. */
async function fakeValidatePipeline({ steps }) {
  for (const step of steps) {
    if (!step.model) continue;
    const model = FAKE_MODELS.find((m) => m.id === step.model);
    if (!model) throw new AppError(`Unknown model '${step.model}'`, { status: 422, code: 'AI_REJECTED_INPUT' });
    if (!model.available) throw new AppError('Model unavailable', { status: 422, code: 'MODEL_UNAVAILABLE' });
  }
  const sr = steps.find((s) => s.op === 'super_resolution');
  return { pipeline: { steps }, scale: sr ? sr.scale ?? 4 : 1 };
}

/** Fake AI client; individual tests override the methods they care about. */
export function createFakeAiClient(overrides = {}) {
  return {
    health: async () => ({ success: true, data: { status: 'ok', device: 'cpu' } }),
    models: async () => ({ models: FAKE_MODELS, operations: [{ op: 'denoise' }], runtime: { device: 'cpu', gpu: null } }),
    preview: async () => ({ buffer: PNG_BYTES, metrics: {} }),
    analyze: async () => structuredClone(FAKE_ANALYSIS),
    validatePipeline: fakeValidatePipeline,
    process: async ({ pipeline, roi }) => {
      const sr = pipeline.steps.find((s) => s.op === 'super_resolution');
      return {
        audit: fakeAudit(pipeline.steps, { scale: sr?.scale ?? 1, roi }),
        display: PNG_BYTES,
        diff: PNG_BYTES,
        data: null,
      };
    },
    ...overrides,
  };
}

export function buildTestApp(overrides = {}) {
  const container = createContainer(config, { aiClient: createFakeAiClient(), ...overrides });
  return { app: createApp(container), container };
}
