import { describe, expect, it } from 'vitest';
import { cleanStep, defaultStep, describePipeline, recommendedPreset, srComparisonPreset, toApiPipeline } from './pipeline.js';

const models = [
  { id: 'bicubic', name: 'Bicubic', kind: 'baseline', task: 'super_resolution', available: true },
  { id: 'swinir-real-x4', name: 'SwinIR', kind: 'ai', task: 'super_resolution', available: true },
  { id: 'realesrgan-x4plus', name: 'ESRGAN', kind: 'ai', task: 'super_resolution', available: false },
  { id: 'scunet-real-psnr', name: 'SCUNet', kind: 'ai', task: 'denoise', available: true },
];
const operations = [
  { op: 'denoise', methods: { nlm: '', tv: '', ai: '' }, params: { strength: { default: 1 } } },
  { op: 'super_resolution', params: { scale: { options: [2, 4], default: 4 } } },
];

describe('pipeline helpers', () => {
  it('builds defaults from the catalogue and prefers available AI models', () => {
    expect(defaultStep('denoise', { operations, models })).toEqual({ op: 'denoise', method: 'nlm', strength: 1 });
    expect(defaultStep('super_resolution', { operations, models })).toEqual({ op: 'super_resolution', model: 'swinir-real-x4', scale: 4 });
  });

  it('strips parameters the chosen method does not use', () => {
    expect(cleanStep({ op: 'deblur', method: 'unsharp', psf_sigma: 1, iterations: 10, amount: 2 }))
      .toEqual({ op: 'deblur', method: 'unsharp', psf_sigma: 1, amount: 2 });
    expect(cleanStep({ op: 'denoise', method: 'ai', model: 'scunet-real-psnr', strength: 1 }))
      .toEqual({ op: 'denoise', method: 'ai', model: 'scunet-real-psnr' });
  });

  it('serialises pipelines for the API with optional labels', () => {
    expect(toApiPipeline({ label: '  ', steps: [{ op: 'contrast', method: 'clahe', clip_limit: 0.01, low_pct: 1 }] }))
      .toEqual({ steps: [{ op: 'contrast', method: 'clahe', clip_limit: 0.01 }] });
  });

  it('creates presets for model comparison and recommendations', () => {
    const preset = srComparisonPreset(models, 2);
    expect(preset.map((p) => p.steps[0].model)).toEqual(['bicubic', 'swinir-real-x4']);
    expect(recommendedPreset({ recommendation: { steps: [{ op: 'denoise', method: 'nlm' }] } }).label).toBe('Recommended');
    expect(recommendedPreset({})).toBeNull();
    expect(describePipeline([{ op: 'denoise', method: 'nlm' }, { op: 'super_resolution', model: 'bicubic', scale: 2 }]))
      .toBe('Noise removal (nlm) → SR bicubic ×2');
  });
});
