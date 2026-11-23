/**
 * Minimal structured logger (JSON in production, readable in development).
 * Avoids a heavy logging dependency while keeping a swappable interface.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

const nodeEnv = process.env.NODE_ENV || 'development';
const configured = process.env.LOG_LEVEL || (nodeEnv === 'test' ? 'silent' : 'info');
const threshold = LEVELS[configured] ?? LEVELS.info;
const asJson = nodeEnv === 'production';

function write(level, message, meta = {}) {
  if (LEVELS[level] < threshold) return;
  const entry = { time: new Date().toISOString(), level, message, ...meta };
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  if (asJson) {
    stream.write(`${JSON.stringify(entry)}\n`);
    return;
  }
  const metaText = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  stream.write(`[${entry.time}] ${level.toUpperCase().padEnd(5)} ${message}${metaText}\n`);
}

export const logger = Object.freeze({
  debug: (msg, meta) => write('debug', msg, meta),
  info: (msg, meta) => write('info', msg, meta),
  warn: (msg, meta) => write('warn', msg, meta),
  error: (msg, meta) => write('error', msg, meta),
});
