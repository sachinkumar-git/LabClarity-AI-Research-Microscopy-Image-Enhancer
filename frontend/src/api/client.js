/** Thin fetch wrapper that unwraps the gateway's `{ success, data | error }` envelope. */
import { API_BASE_URL, API_PREFIX } from '../config.js';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Absolute URL for API paths and for links returned by the API (e.g. `/api/v1/images/..`). */
export const apiUrl = (path) => `${API_BASE_URL}${path.startsWith(API_PREFIX) ? '' : API_PREFIX}${path}`;

/** Parses a response body (text) into data, or throws an ApiError. */
export function parseEnvelope(status, text, { withMeta = false } = {}) {
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON (e.g. proxy error page) */
  }
  if (status >= 200 && status < 300) {
    return withMeta ? { data: body?.data ?? null, meta: body?.meta ?? null } : body?.data ?? null;
  }
  const err = body?.error;
  throw new ApiError(err?.message || `Request failed (${status})`, {
    status,
    code: err?.code || 'HTTP_ERROR',
    details: err?.details,
  });
}

export async function request(path, { method = 'GET', signal, body, withMeta = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(apiUrl(path), {
      method,
      signal,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the LabClarity server. Is the backend running?');
  }
  return parseEnvelope(response.status, await response.text(), { withMeta });
}
