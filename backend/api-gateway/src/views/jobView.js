/** Serialises a Job document into its public API representation. */
import { API_PREFIX, JOB_STATUS } from '../config/constants.js';

const BROWSER_SAFE_MIME = new Set(['image/png', 'image/jpeg']);

export function toJobView(job) {
  const base = `${API_PREFIX}/images/${job.publicId}`;
  const hasPreview = Boolean(job.files?.preview) || BROWSER_SAFE_MIME.has(job.mimeType);
  const isDone = job.status === JOB_STATUS.COMPLETED && Boolean(job.files?.enhanced);

  return {
    id: job.publicId,
    status: job.status,
    model: job.model,
    scale: job.scale,
    originalName: job.originalName,
    mimeType: job.mimeType,
    sizeBytes: job.sizeBytes,
    metrics: job.metrics ?? null,
    error: job.status === JOB_STATUS.FAILED ? job.errorMessage ?? 'Processing failed' : null,
    links: {
      self: base,
      original: `${base}/original`,
      preview: hasPreview ? `${base}/preview` : null,
      enhanced: isDone ? `${base}/enhanced` : null,
      enhancedData: isDone && job.files?.enhancedData ? `${base}/enhanced-data` : null,
    },
    createdAt: job.createdAt,
    startedAt: job.startedAt ?? null,
    completedAt: job.completedAt ?? null,
    expiresAt: job.expiresAt ?? null,
  };
}
