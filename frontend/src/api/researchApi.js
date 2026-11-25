/** Research workspace API: experiments, source images, runs, batches, stats and reports. */
import { ApiError, apiUrl, parseEnvelope, request } from './client.js';

const id = (value) => encodeURIComponent(value);

export const listExperiments = (signal) => request('/experiments', { signal });
export const getExperiment = (experimentId, signal) => request(`/experiments/${id(experimentId)}`, { signal });
export const createExperiment = (body) => request('/experiments', { method: 'POST', body });
export const updateExperiment = (experimentId, body) => request(`/experiments/${id(experimentId)}`, { method: 'PATCH', body });
export const deleteExperiment = (experimentId) => request(`/experiments/${id(experimentId)}`, { method: 'DELETE' });

export const listAssets = (signal) => request('/assets', { signal });
export const verifyAsset = (assetId) => request(`/assets/${id(assetId)}/verify`);
export const deleteAsset = (assetId) => request(`/assets/${id(assetId)}`, { method: 'DELETE' });

/** Starts runs: images x pipelines (comparison and/or batch). Returns the batch. */
export const createRuns = (body) => request('/runs', { method: 'POST', body });
export const getBatch = (batchId, signal) => request(`/batches/${id(batchId)}`, { signal });
export const getRun = (runId, signal) => request(`/jobs/${id(runId)}`, { signal });
export const deleteRun = (runId) => request(`/jobs/${id(runId)}`, { method: 'DELETE' });
export const retryRun = (runId) => request(`/jobs/${id(runId)}/retry`, { method: 'POST' });
export const retryBatch = (batchId) => request(`/batches/${id(batchId)}/retry`, { method: 'POST' });
export const cancelBatch = (batchId) => request(`/batches/${id(batchId)}/cancel`, { method: 'POST' });

const toQuery = (filters) => new URLSearchParams(Object.entries(filters).filter(([, v]) => v != null && v !== ''));
export const listRuns = (filters = {}, signal) => request(`/jobs?${toQuery(filters)}`, { signal });
/** Same as listRuns but also returns pagination meta ({ total, page, limit }). */
export const listRunsPage = (filters = {}, signal) => request(`/jobs?${toQuery(filters)}`, { signal, withMeta: true });

export const getStats = (signal, days = 14) => request(`/stats?days=${days}`, { signal });

/**
 * Uploads several images (multipart, real progress via XHR). Each is analysed on the server.
 * Returns { promise, abort }.
 */
export function uploadAssets({ files, experimentId, onProgress }) {
  const xhr = new XMLHttpRequest();
  const form = new FormData();
  if (experimentId) form.append('experimentId', experimentId);
  files.forEach((file) => form.append('images', file));

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
    xhr.open('POST', apiUrl('/assets'));
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.send(form);
  });
  return { promise, abort: () => xhr.abort() };
}
