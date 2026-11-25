const HOUR_MS = 60 * 60 * 1000;

/** Experiment data is retained indefinitely; ad-hoc uploads expire after the retention window. */
export const expiresAtFor = (experimentId, retentionHours) =>
  experimentId ? null : new Date(Date.now() + retentionHours * HOUR_MS);
