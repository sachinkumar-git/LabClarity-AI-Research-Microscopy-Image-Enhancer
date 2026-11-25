/**
 * HTTP client for the Python AI microservice.
 * Authenticates with a shared internal token and enforces request timeouts.
 */
import { AppError } from '../utils/AppError.js';

const METRICS_HEADER = 'x-enhance-metrics';

export function createAiClient({ baseUrl, token, timeoutMs }) {
  async function request(path, { method = 'GET', body, headers = {}, timeout = timeoutMs } = {}) {
    const auth = token ? { 'X-Internal-Token': token } : {};
    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        body,
        headers: { ...auth, ...headers },
        signal: AbortSignal.timeout(timeout),
      });
    } catch (err) {
      const reason = err.name === 'TimeoutError' ? 'timed out' : 'is unreachable';
      throw AppError.aiUnavailable(`AI service ${reason}`);
    }
    if (!response.ok) throw await toAppError(response);
    return response;
  }

  function postForm(path, { buffer, mimeType, filename }, fields = {}, extraFiles = {}, timeout) {
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => value != null && form.append(key, String(value)));
    form.append('image', new Blob([buffer], { type: mimeType }), filename);
    Object.entries(extraFiles).forEach(([key, file]) => {
      if (file) form.append(key, new Blob([file.buffer], { type: file.mimeType }), file.filename);
    });
    return request(path, { method: 'POST', body: form, timeout });
  }

  return {
    async health() {
      return (await request('/health', { timeout: 3_000 })).json();
    },

    async models() {
      return (await (await request('/v1/models', { timeout: 5_000 })).json()).data;
    },

    async preview(input) {
      const res = await postForm('/v1/preview', input, {}, {}, 60_000);
      return { buffer: Buffer.from(await res.arrayBuffer()), metrics: parseJson(res.headers.get(METRICS_HEADER)) };
    },

    async analyze(input) {
      return (await (await postForm('/v1/analyze', input, {}, {}, 60_000)).json()).data;
    },

    /** Validates a pipeline against the AI service's schema; returns { pipeline, scale }. */
    async validatePipeline(pipeline) {
      const res = await request('/v1/pipeline/validate', {
        method: 'POST',
        body: JSON.stringify(pipeline),
        headers: { 'Content-Type': 'application/json' },
        timeout: 5_000,
      });
      return (await res.json()).data;
    },

    /** Runs a pipeline. Returns { audit, display, data, diff } (data may be null). */
    async process({ pipeline, roi, reference, ...input }) {
      const fields = { pipeline: JSON.stringify(pipeline), roi: roi ? JSON.stringify(roi) : null };
      const res = await postForm('/v1/process', input, fields, { reference });
      const parts = await res.formData();
      const toBuffer = async (part) => (part ? Buffer.from(await part.arrayBuffer()) : null);
      const audit = parts.get('audit');
      return {
        audit: parseJson(typeof audit === 'string' ? audit : await audit?.text()),
        display: await toBuffer(parts.get('display')),
        data: await toBuffer(parts.get('data')),
        diff: await toBuffer(parts.get('diff')),
      };
    },
  };
}

function parseJson(raw) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Converts an AI-service error response into an AppError, preserving client errors. */
async function toAppError(response) {
  let detail = `AI service responded with ${response.status}`;
  let code;
  try {
    const body = await response.json();
    detail = body?.error?.message || detail;
    code = body?.error?.code;
  } catch {
    /* non-JSON body: keep generic message */
  }
  if ([400, 404, 413, 422].includes(response.status)) {
    return new AppError(detail, { status: 422, code: code === 'MODEL_UNAVAILABLE' ? code : 'AI_REJECTED_INPUT' });
  }
  return AppError.aiUnavailable(detail);
}
