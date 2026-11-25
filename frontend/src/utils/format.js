/** Pure display formatters. */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export const formatDimensions = (w, h) => (w && h ? `${w} × ${h}` : '—');

export function formatMegapixels(w, h) {
  if (!w || !h) return '—';
  return `${((w * h) / 1e6).toFixed(w * h >= 1e7 ? 0 : 2)} MP`;
}

/** "just now", "5 min ago", "3 h ago", "2 d ago", then a date. */
export function timeAgo(value, now = Date.now()) {
  if (!value) return '—';
  const seconds = Math.max(0, (now - new Date(value).getTime()) / 1000);
  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} h ago`;
  if (seconds < 7 * 86_400) return `${Math.round(seconds / 86_400)} d ago`;
  return new Date(value).toLocaleDateString();
}
