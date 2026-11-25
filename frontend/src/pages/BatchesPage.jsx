import { Layers, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { listRuns } from '../api/researchApi.js';
import { BatchControls } from '../components/batch/BatchControls.jsx';
import { Button } from '../components/common/Button.jsx';
import { SegmentedControl } from '../components/common/SegmentedControl.jsx';
import { SkeletonGrid } from '../components/common/Skeleton.jsx';
import { Reveal, Stagger, StaggerItem } from '../components/motion/Reveal.jsx';
import { usePolling } from '../hooks/useApi.js';
import { timeAgo } from '../utils/format.js';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'In progress' },
  { value: 'done', label: 'Completed' },
  { value: 'failed', label: 'With failures' },
];

/** Batches are derived from recent runs grouped by batchId (newest first). */
export function groupBatches(runs) {
  const map = new Map();
  for (const run of runs) {
    if (!run.batchId) continue;
    const b = map.get(run.batchId) ?? { id: run.batchId, runs: [], counts: { queued: 0, processing: 0, completed: 0, failed: 0 }, createdAt: run.createdAt };
    b.runs.push(run);
    b.counts[run.status] += 1;
    if (run.createdAt < b.createdAt) b.createdAt = run.createdAt;
    map.set(run.batchId, b);
  }
  return [...map.values()].map((b) => ({
    ...b,
    images: new Set(b.runs.map((r) => r.originalName)).size,
    pipelines: new Set(b.runs.map((r) => r.label)).size,
    active: b.counts.queued + b.counts.processing > 0,
    percent: Math.round(((b.counts.completed + b.counts.failed) / b.runs.length) * 100),
  }));
}

const matches = (b, filter) => filter === 'all' || (filter === 'active' && b.active)
  || (filter === 'done' && !b.active && !b.counts.failed) || (filter === 'failed' && b.counts.failed > 0);

export function BatchesPage() {
  const [filter, setFilter] = useState('all');
  const [tick, setTick] = useState(0);
  const { data, error } = usePolling((signal) => listRuns({ limit: 100 }, signal), `batches-${tick}`, {
    interval: 3000,
    isDone: (runs) => !runs.some((r) => r.status === 'queued' || r.status === 'processing'),
  });
  const batches = data ? groupBatches(data).filter((b) => matches(b, filter)) : null;

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-6">
      <Reveal as="header" className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Batch Processing</h1>
          <p className="mt-1 text-sm text-slate-400">Background jobs across your recent uploads. Retry failures or cancel queued work.</p>
        </div>
        <Button as={Link} to="/enhance" icon={Plus}>New batch</Button>
      </Reveal>
      <SegmentedControl label="Filter batches" options={FILTERS} value={filter} onChange={setFilter} size="sm" />
      {error && <p className="text-sm text-rose-300">{error.message}</p>}
      {!batches && <SkeletonGrid count={4} className="grid gap-4 lg:grid-cols-2" item="h-40" />}
      {batches?.length === 0 && (
        <div className="glass p-10 text-center">
          <Layers className="mx-auto size-8 text-slate-500" aria-hidden />
          <p className="mt-3 text-sm text-slate-400">No batches here yet. Select several images or pipelines in Enhance to start one.</p>
        </div>
      )}
      <Stagger key={filter} className="grid gap-4 lg:grid-cols-2">
        {(batches ?? []).map((b) => (
          <StaggerItem key={b.id} className="glass card-interactive p-5">
            <div className="flex items-start justify-between gap-3">
              <Link to={`/batches/${b.id}`} className="min-w-0">
                <p className="truncate font-semibold text-white hover:text-brand-300">{b.images} image{b.images === 1 ? '' : 's'} × {b.pipelines} pipeline{b.pipelines === 1 ? '' : 's'}</p>
                <p className="text-xs text-slate-500">{b.runs.length} runs · started {timeAgo(b.createdAt)}</p>
              </Link>
              <span className="font-mono text-sm text-slate-300">{b.percent}%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-700/40">
              <div className={`h-full rounded-full bg-brand-500 transition-[width] duration-700 ${b.active ? 'animate-pulse' : ''}`} style={{ width: `${Math.max(b.percent, 3)}%` }} />
            </div>
            <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-slate-400">
              <span>{b.counts.completed} completed</span><span>{b.counts.processing} processing</span><span>{b.counts.queued} queued</span>
              {b.counts.failed > 0 && <span className="text-rose-300">{b.counts.failed} failed</span>}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <BatchControls batchId={b.id} counts={b.counts} reportLink={`/api/v1/reports/batches/${b.id}`} onChanged={() => setTick((t) => t + 1)} />
              <Link to={`/batches/${b.id}`} className="text-sm font-medium text-brand-300 hover:underline">Open →</Link>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </main>
  );
}
