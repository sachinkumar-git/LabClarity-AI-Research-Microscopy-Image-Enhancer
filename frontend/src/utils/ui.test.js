import { describe, expect, it } from 'vitest';
import { initials } from '../components/layout/AccountMenu.jsx';
import { sectionFor } from '../components/layout/navItems.js';
import { groupBatches } from '../pages/BatchesPage.jsx';
import { timeAgo } from './format.js';
import { pipelineForModel } from './pipeline.js';

const run = (batchId, status, name = 'a.png', label = 'P1', createdAt = '2026-11-25T10:00:00Z') =>
  ({ id: `${batchId}-${status}-${name}-${label}`, batchId, status, originalName: name, label, createdAt });

describe('groupBatches', () => {
  it('groups runs by batch with counts, progress and dimensions', () => {
    const [b] = groupBatches([
      run('b1', 'completed', 'a.png', 'P1'),
      run('b1', 'failed', 'b.png', 'P1', '2026-11-25T09:00:00Z'),
      run('b1', 'queued', 'a.png', 'P2'),
      { id: 'x', batchId: null, status: 'completed' },
    ]);
    expect(b.counts).toEqual({ queued: 1, processing: 0, completed: 1, failed: 1 });
    expect(b.percent).toBe(67);
    expect(b.active).toBe(true);
    expect(b.images).toBe(2);
    expect(b.pipelines).toBe(2);
    expect(b.createdAt).toBe('2026-11-25T09:00:00Z');
  });
});

describe('header helpers', () => {
  it('derives avatar initials and falls back to LC', () => {
    expect(initials('Sachin Kumar')).toBe('SK');
    expect(initials('  ada ')).toBe('A');
    expect(initials('')).toBe('LC');
  });

  it('maps detail routes to their navigation section', () => {
    expect(sectionFor('/runs/123')).toBe('/history');
    expect(sectionFor('/batches/abc')).toBe('/batches');
    expect(sectionFor('/projects/p1')).toBe('/projects');
    expect(sectionFor('/models')).toBeNull();
  });

  it('formats relative times', () => {
    const now = Date.parse('2026-11-25T12:00:00Z');
    expect(timeAgo('2026-11-25T11:59:40Z', now)).toBe('just now');
    expect(timeAgo('2026-11-25T11:30:00Z', now)).toBe('30 min ago');
    expect(timeAgo('2026-11-25T09:00:00Z', now)).toBe('3 h ago');
    expect(timeAgo('2026-11-23T12:00:00Z', now)).toBe('2 d ago');
    expect(timeAgo(null)).toBe('—');
  });
});

describe('pipelineForModel (Model Library deep link)', () => {
  it('builds the right single-step pipeline per task and refuses unavailable models', () => {
    expect(pipelineForModel({ id: 'scunet-real-psnr', name: 'SCUNet', task: 'denoise', available: true }).steps)
      .toEqual([{ op: 'denoise', method: 'ai', model: 'scunet-real-psnr' }]);
    expect(pipelineForModel({ id: 'bicubic', name: 'Bicubic', task: 'super_resolution', scales: [2, 4], available: true }).steps)
      .toEqual([{ op: 'super_resolution', model: 'bicubic', scale: 4 }]);
    expect(pipelineForModel({ id: 'x', available: false })).toBeNull();
  });
});
