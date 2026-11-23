/**
 * HTTP client for the Python AI microservice.
 * Authenticates with a shared internal token and enforces request timeouts.
 */
import { AppError } from '../utils/AppError.js';

const METRICS_HEADER = 'x-enhance-metrics';

export function createAiClient({ baseUrl, token, timeoutMs }) {
  async function request(path, { method = 'GET', body, timeout = timeoutMs } = {}) {
    const headers = token ? { 'X-Internal-Token': token } : {};
    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        body,
        headers,
        signal: AbortSignal.timeout(timeout),
      });
    } catch (err) {
      const reason = err.name === 'TimeoutError' ? 'timed out' : 'is unreachable';
      throw AppError.aiUnavailable(`AI service ${reason}`);
    }
    if (!response.ok) throw await toAppError(response);
    return response;
  }

  function postImage(path, { buffer, mimeType, filename }, fields = {}) {
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => form.append(key, String(value)));
    form.append('image', new Blob([buffer], { type: mimeType }), filename);
    return request(path, { method: 'POST', body: form });
  }

  /** Preview: a single PNG, metrics in a header. */
  async function preview(input) {
    const res = await postImage('/v1/preview', input);
    return {
      buffer: Buffer.from(await res.arrayBuffer()),
      metrics: parseMetrics(res.headers.get(METRICS_HEADER)),
    };
  }

  /** Enhance: multipart with `metrics`, `display` (8-bit PNG) and optional `data` (16-bit PNG). */
  async function enhance({ model, scale, ...input }) {
    const res = await postImage('/v1/enhance', input, { model, scale });
    const parts = await res.formData();
    const toBuffer = async (part) => (part ? Buffer.from(await part.arrayBuffer()) : null);
    const metrics = parts.get('metrics');
    return {
      buffer: await toBuffer(parts.get('display')),
      dataBuffer: await toBuffer(parts.get('data')),
      metrics: parseMetrics(typeof metrics === 'string' ? metrics : await metrics?.text()),
    };
  }

  return {
    async health() {
      const res = await request('/health', { timeout: 3_000 });
      return res.json();
    },

    async models() {
      const res = await request('/v1/models', { timeout: 5_000 });
      return (await res.json()).data;
    },

    preview,
    enhance,
  };
}

function parseMetrics(raw) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Converts an AI-service error response into an AppError, preserving client errors. */
async function toAppError(response) {
  let detail = `AI service responded with ${response.status}`;
  try {
    const body = await response.json();
    if (body?.error?.message) detail = body.error.message;
  } catch {
    /* non-JSON body: keep generic message */
  }
  if ([400, 404, 413, 422].includes(response.status)) {
    return new AppError(detail, { status: 422, code: 'AI_REJECTED_INPUT' });
  }
  return AppError.aiUnavailable(detail);
}
