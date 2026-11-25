/** Serialises a Job document into its public API representation. */
import { API_PREFIX, JOB_STATUS } from '../config/constants.js';

const BROWSER_SAFE_MIME = new Set(['image/png', 'image/jpeg']);

function links(job) {
  const base = `${API_PREFIX}/images/${job.publicId}`;
  const files = job.files ?? {};
  const done = job.status === JOB_STATUS.COMPLETED && Boolean(files.enhanced);
  const hasPreview = Boolean(files.preview) || BROWSER_SAFE_MIME.has(job.mimeType);
  return {
    self: base,
    original: `${base}/original`,
    preview: hasPreview ? `${base}/preview` : null,
    enhanced: done ? `${base}/enhanced` : null,
    enhancedData: done && files.enhancedData ? `${base}/enhanced-data` : null,
    diff: done && files.diff ? `${base}/diff` : null,
    report: done ? `${API_PREFIX}/reports/jobs/${job.publicId}` : null,
  };
}

/** Compact form for lists. */
export function toJobSummary(job) {
  return {
    id: job.publicId,
    status: job.status,
    label: job.label ?? null,
    model: job.model,
    scale: job.scale,
    assetId: job.assetId ?? null,
    experimentId: job.experimentId ?? null,
    batchId: job.batchId ?? null,
    originalName: job.originalName,
    mimeType: job.mimeType,
    sizeBytes: job.sizeBytes,
    roi: job.roi ?? null,
    metrics: job.metrics ?? null,
    quality: job.quality ?? null,
    error: job.status === JOB_STATUS.FAILED ? job.errorMessage ?? 'Processing failed' : null,
    links: links(job),
    createdAt: job.createdAt,
    startedAt: job.startedAt ?? null,
    completedAt: job.completedAt ?? null,
    expiresAt: job.expiresAt ?? null,
  };
}

/** Full form including the reproducibility record. */
export function toJobView(job) {
  return {
    ...toJobSummary(job),
    inputSha256: job.inputSha256 ?? null,
    pipeline: job.pipeline ?? null,
    referenceAssetId: job.referenceAssetId ?? null,
    audit: job.audit ?? null,
  };
}
