import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { getBatch, getRun } from '../api/researchApi.js';
import { BatchControls } from '../components/batch/BatchControls.jsx';
import { ComparisonGrid } from '../components/batch/ComparisonGrid.jsx';
import { ComparisonTable } from '../components/batch/ComparisonTable.jsx';
import { Alert } from '../components/common/Alert.jsx';
import { PageSkeleton } from '../components/common/Skeleton.jsx';
import { Panel } from '../components/common/Panel.jsx';
import { useApi, usePolling } from '../hooks/useApi.js';

function Progress({ batch }) {
  const { counts } = batch;
  return (
    <div className="space-y-2">
      <div className="h-2 overflow-hidden rounded-full bg-white/5" role="progressbar" aria-valuenow={batch.percent}>
        <div className={`h-full rounded-full bg-gradient-to-r from-brand-400 to-accent-500 transition-[width] duration-500 ${batch.done ? '' : 'animate-pulse'}`} style={{ width: `${Math.max(batch.percent, 3)}%` }} />
      </div>
      <p className="flex flex-wrap gap-x-4 text-xs text-slate-400">
        <span className="font-mono text-white">{batch.percent}%</span>
        <span>{counts.completed} completed</span><span>{counts.processing} processing</span>
        <span>{counts.queued} queued</span>{counts.failed > 0 && <span className="text-rose-300">{counts.failed} failed</span>}
      </p>
    </div>
  );
}

/** Groups runs by source image: each image gets its own synchronised comparison grid. */
function byImage(runs) {
  const groups = new Map();
  runs.forEach((r) => groups.set(r.assetId, [...(groups.get(r.assetId) ?? []), r]));
  return [...groups.values()];
}

export function BatchPage() {
  const { id } = useParams();
  const [tick, setTick] = useState(0);
  const { data: batch, error } = usePolling((signal) => getBatch(id, signal), `${id}-${tick}`, { isDone: (b) => b.done });
  // Full run records (with audit/ROI) are needed to align ROI crops in the grid.
  const doneKey = batch ? batch.jobs.filter((j) => j.status === 'completed').map((j) => j.id).join() : '';
  const { data: details } = useApi((signal) => Promise.all((batch?.jobs ?? []).map((j) => getRun(j.id, signal))), doneKey);

  if (error) return <main className="mx-auto max-w-3xl px-4 py-16"><Alert tone="error" title="Batch not available">{error.message}</Alert></main>;
  if (!batch) return <PageSkeleton />;
  const runs = details?.length === batch.jobs.length ? details : batch.jobs;
  const kind = new Set(batch.jobs.map((j) => j.assetId)).size > 1 ? 'Batch' : batch.total > 1 ? 'Model comparison' : 'Run';

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500"><Link to="/batches" className="hover:text-brand-300">Batch Processing</Link> · {kind} · {batch.total} run{batch.total === 1 ? '' : 's'}</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">{batch.done ? 'Processing complete' : 'Processing…'}</h1>
        </div>
        <BatchControls batchId={batch.id} counts={batch.counts} reportLink={batch.links.report} onChanged={() => setTick((t) => t + 1)} size="md" />
      </header>
      <Panel><Progress batch={batch} /></Panel>
      {byImage(runs).map((group) => (
        <Panel key={group[0].assetId} title={group[0].originalName} subtitle={`${group.length} pipeline${group.length === 1 ? '' : 's'}`}>
          <ComparisonGrid runs={group} />
        </Panel>
      ))}
      <Panel title="Metrics comparison"><ComparisonTable runs={runs} /></Panel>
    </main>
  );
}
