/** Human-readable naming helpers for normalised pipeline specs. */
const OP_NAMES = { denoise: 'Denoise', deblur: 'Deblur', contrast: 'Contrast', super_resolution: 'SR' };

function describeStep(step) {
  if (step.op === 'super_resolution') return `SR ${step.model} ×${step.scale}`;
  const detail = step.method === 'ai' ? step.model : step.method;
  return `${OP_NAMES[step.op] ?? step.op} (${detail})`;
}

export const describePipeline = (pipeline) => pipeline.steps.map(describeStep).join(' → ').slice(0, 80);

/** The model that best identifies a run: the SR model, else the last AI model, else "classical". */
export function primaryModel(pipeline) {
  const steps = pipeline.steps;
  const sr = steps.find((s) => s.op === 'super_resolution');
  if (sr) return sr.model;
  const ai = [...steps].reverse().find((s) => s.model);
  return ai ? ai.model : 'classical';
}
