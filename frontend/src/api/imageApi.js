/** Image enhancement API calls. */
import { ApiError, apiUrl, parseEnvelope, request } from './client.js';

export const listModels = (signal) => request('/models', { signal });

export const getJob = (id, signal) => request(`/images/${encodeURIComponent(id)}`, { signal });

export const deleteJob = (id) => request(`/images/${encodeURIComponent(id)}`, { method: 'DELETE' });

/**
 * Uploads an image with real progress reporting (fetch has no upload progress, XHR does).
 * Returns { promise, abort }.
 */
export function uploadImage({ file, model, scale, onProgress }) {
  const xhr = new XMLHttpRequest();
  const form = new FormData();
  form.append('model', model);
  form.append('scale', String(scale));
  form.append('image', file);

  const promise = new Promise((resolve, reject) => {
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      try {
        resolve(parseEnvelope(xhr.status, xhr.responseText));
      } catch (err) {
        reject(err);
      }
    };
    xhr.onerror = () => reject(new ApiError('Upload failed: cannot reach the server.'));
    xhr.onabort = () => reject(new ApiError('Upload cancelled', { code: 'ABORTED' }));
    xhr.open('POST', apiUrl('/images'));
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.send(form);
  });

  return { promise, abort: () => xhr.abort() };
}

/** Resolves a link from a job payload into a loadable URL. */
export const assetUrl = (link, { download = false } = {}) =>
  link ? `${apiUrl(link)}${download ? '?download=1' : ''}` : null;
