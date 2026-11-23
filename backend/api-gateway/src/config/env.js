/**
 * Centralised, validated environment configuration.
 * Fails fast at startup instead of failing later at runtime.
 */
import path from 'node:path';

const toInt = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value) || value < 0) throw new Error(`Env ${name} must be a non-negative integer`);
  return value;
};

const toList = (raw) => (raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []);

function buildConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  const config = {
    nodeEnv,
    isProduction,
    isTest: nodeEnv === 'test',
    port: toInt('PORT', 5000),
    logLevel: process.env.LOG_LEVEL || (nodeEnv === 'test' ? 'silent' : 'info'),
    trustProxy: toInt('TRUST_PROXY', 0),
    mongoUri: process.env.MONGODB_URI || '',
    corsOrigins: toList(process.env.CORS_ORIGINS || 'http://localhost:5173'),
    ai: {
      baseUrl: (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, ''),
      token: process.env.AI_SERVICE_TOKEN || '',
      timeoutMs: toInt('AI_TIMEOUT_MS', 300_000),
    },
    upload: {
      maxFileSizeMb: toInt('MAX_UPLOAD_MB', 25),
    },
    storageDir: path.resolve(process.env.STORAGE_DIR || './storage'),
    rateLimit: {
      windowMs: toInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
      max: toInt('RATE_LIMIT_MAX', 300),
      uploadMax: toInt('UPLOAD_RATE_LIMIT_MAX', 20),
    },
    jobs: {
      concurrency: Math.max(1, toInt('JOB_CONCURRENCY', 1)),
      retentionHours: toInt('JOB_RETENTION_HOURS', 24),
    },
  };

  validate(config);
  return Object.freeze(config);
}

function validate(config) {
  const errors = [];
  if (!config.mongoUri && !config.isTest) errors.push('MONGODB_URI is required');
  if (config.isProduction && config.ai.token.length < 32) {
    errors.push('AI_SERVICE_TOKEN must be at least 32 characters in production');
  }
  if (config.upload.maxFileSizeMb < 1) errors.push('MAX_UPLOAD_MB must be >= 1');
  if (errors.length) throw new Error(`Invalid configuration:\n - ${errors.join('\n - ')}`);
}

export const config = buildConfig();
