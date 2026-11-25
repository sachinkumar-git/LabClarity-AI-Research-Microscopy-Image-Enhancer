/** Public representations of assets, experiments and batches. */
import { API_PREFIX } from '../config/constants.js';
import { toJobSummary } from './jobView.js';

const BROWSER_SAFE_MIME = new Set(['image/png', 'image/jpeg']);

export function toAssetView(asset) {
  const base = `${API_PREFIX}/assets/${asset.publicId}`;
  const previewable = Boolean(asset.files?.preview) || BROWSER_SAFE_MIME.has(asset.mimeType);
  return {
    id: asset.publicId,
    experimentId: asset.experimentId ?? null,
    originalName: asset.originalName,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    sha256: asset.sha256,
    analysis: asset.analysis ?? null,
    recommendation: asset.recommendation ?? null,
    analysisError: asset.analysisError ?? null,
    links: {
      self: base,
      original: `${base}/original`,
      preview: previewable ? `${base}/preview` : null,
      verify: `${base}/verify`,
    },
    createdAt: asset.createdAt,
    expiresAt: asset.expiresAt ?? null,
  };
}

export function toExperimentView(experiment, counts = {}) {
  return {
    id: experiment.publicId,
    name: experiment.name,
    description: experiment.description,
    tags: experiment.tags,
    imageCount: counts.assets?.[experiment.publicId] ?? 0,
    runCount: counts.jobs?.[experiment.publicId] ?? 0,
    links: {
      self: `${API_PREFIX}/experiments/${experiment.publicId}`,
      report: `${API_PREFIX}/reports/experiments/${experiment.publicId}`,
    },
    createdAt: experiment.createdAt,
    updatedAt: experiment.updatedAt,
  };
}

export function toBatchView(progress) {
  return {
    id: progress.id,
    total: progress.total,
    counts: progress.counts,
    percent: progress.percent,
    done: progress.done,
    jobs: progress.jobs.map(toJobSummary),
    links: {
      self: `${API_PREFIX}/batches/${progress.id}`,
      report: `${API_PREFIX}/reports/batches/${progress.id}`,
    },
  };
}
