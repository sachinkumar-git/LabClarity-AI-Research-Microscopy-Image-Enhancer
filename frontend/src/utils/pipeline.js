/** Pure helpers for building, describing and presetting processing pipelines. */
export const OP_LABELS = {
  denoise: 'Noise removal',
  deblur: 'Blur reduction',
  contrast: 'Contrast enhancement',
  super_resolution: 'Super-resolution',
};

export const availableModels = (models, task) => models.filter((m) => m.task === task && m.available);

/** A new step with catalogue defaults (and the best available model where one is needed). */
export function defaultStep(op, { operations = [], models = [], preferredSrModel = '' } = {}) {
  const spec = operations.find((o) => o.op === op);
  const params = Object.fromEntries(
    Object.entries(spec?.params ?? {}).map(([key, p]) => [key, p.default]),
  );
  if (op === 'super_resolution') {
    const sr = availableModels(models, 'super_resolution');
    const model = sr.find((m) => m.id === preferredSrModel) ?? sr.find((m) => m.kind === 'ai') ?? { id: 'bicubic' };
    return { op, model: model.id, scale: params.scale ?? 4 };
  }
  const method = Object.keys(spec?.methods ?? {})[0];
  return { op, ...(method ? { method } : {}), ...params };
}

/** Only send the parameters that the step's method actually uses. */
export const RELEVANT_PARAMS = {
  denoise: { nlm: ['strength'], tv: ['strength'], ai: ['model'] },
  deblur: { richardson_lucy: ['psf_sigma', 'iterations'], unsharp: ['psf_sigma', 'amount'] },
  contrast: { clahe: ['clip_limit'], stretch: ['low_pct', 'high_pct'] },
};

export function cleanStep(step) {
  if (step.op === 'super_resolution') return { op: step.op, model: step.model, scale: step.scale };
  const keys = RELEVANT_PARAMS[step.op]?.[step.method] ?? [];
  return { op: step.op, method: step.method, ...Object.fromEntries(keys.map((k) => [k, step[k]])) };
}

export const toApiPipeline = ({ label, steps }) => ({
  ...(label?.trim() ? { label: label.trim().slice(0, 80) } : {}),
  steps: steps.map(cleanStep),
});

export function describeStep(step) {
  if (step.op === 'super_resolution') return `SR ${step.model} ×${step.scale}`;
  const detail = step.method === 'ai' ? step.model : step.method?.replace('_', '-');
  return `${OP_LABELS[step.op] ?? step.op} (${detail})`;
}

export const describePipeline = (steps) => steps.map(describeStep).join(' → ');

let counter = 0;
export const newPipeline = (steps = [], label = '') => ({ key: `p${(counter += 1)}`, label, steps });

/** One pipeline per available super-resolution model: the multi-model comparison preset. */
export function srComparisonPreset(models, scale = 4, prefix = []) {
  return availableModels(models, 'super_resolution').map((m) =>
    newPipeline([...prefix, { op: 'super_resolution', model: m.id, scale }], m.name),
  );
}

export const recommendedPreset = (asset) =>
  asset?.recommendation?.steps?.length
    ? newPipeline(structuredClone(asset.recommendation.steps), 'Recommended')
    : null;

export const changesIntensities = (steps) => steps.some((s) => s.op === 'contrast');

/** A one-step pipeline that uses the given model (deep link from the Model Library). */
export function pipelineForModel(model) {
  if (!model?.available) return null;
  const step = model.task === 'denoise'
    ? { op: 'denoise', method: 'ai', model: model.id }
    : { op: 'super_resolution', model: model.id, scale: model.scales?.includes(4) ? 4 : 2 };
  return newPipeline([step], model.name);
}
