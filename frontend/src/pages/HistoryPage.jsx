import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { deleteRun, listExperiments, listRunsPage } from '../api/researchApi.js';
import { Button } from '../components/common/Button.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { RunActions } from '../components/history/RunActions.jsx';
import { Reveal } from '../components/motion/Reveal.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { formatDuration, timeAgo } from '../utils/format.js';

const LIMIT = 20;
const selectCls = 'h-10 rounded-xl border border-line bg-ink-900/70 px-3 text-sm text-slate-100 focus:border-brand-400/60 focus:outline-none';

export function HistoryPage() {
  const { models } = useCatalog();
  const { notify } = useToast();
  const [filters, setFilters] = useState({ status: '', model: '', experimentId: '' });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState(null);
  const { data: projects } = useApi(listExperiments, 'projects');
  const key = JSON.stringify({ ...filters, page });
  const { data, loading, error, reload } = useApi((signal) => listRunsPage({ ...filters, page, limit: LIMIT }, signal), key);

  const setFilter = (name, value) => {
    setFilters((f) => ({ ...f, [name]: value }));
    setPage(1);
  };
  const total = data?.meta?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const q = search.trim().toLowerCase();
  const runs = (data?.data ?? []).filter((r) => !q || `${r.originalName} ${r.label ?? ''} ${r.model}`.toLowerCase().includes(q));

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-6">
      <Reveal as="header">
        <h1 className="text-3xl font-bold tracking-tight text-white">History</h1>
        <p className="mt-1 text-sm text-slate-400">Every processing run, with its configuration, status and results.</p>
      </Reveal>
      <div className="flex flex-wrap items-center gap-3">
        <select aria-label="Filter by status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={selectCls}>
          <option value="">All statuses</option>
          {['completed', 'processing', 'queued', 'failed'].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select aria-label="Filter by model" value={filters.model} onChange={(e) => setFilter('model', e.target.value)} className={selectCls}>
          <option value="">All models</option>
          {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          <option value="classical">Classical only</option>
        </select>
        <select aria-label="Filter by project" value={filters.experimentId} onChange={(e) => setFilter('experimentId', e.target.value)} className={selectCls}>
          <option value="">All projects</option>
          {(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search this page" aria-label="Search runs on this page" className={`${selectCls} w-full pl-9`} />
        </label>
      </div>

      <section className="glass overflow-x-auto p-2">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              {['When', 'Pipeline', 'Image', 'Status', 'Output', 'PSNR / SSIM', 'Time', ''].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading && !data && [0, 1, 2, 3, 4].map((i) => (
              <tr key={i}><td colSpan={8} className="px-3 py-2"><Skeleton className="h-8 w-full" /></td></tr>
            ))}
            {runs.map((r) => (
              <tr key={r.id} className="border-t border-line transition-colors hover:bg-white/[0.03]">
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-500" title={new Date(r.createdAt).toLocaleString()}>{timeAgo(r.createdAt)}</td>
                <td className="max-w-[260px] truncate px-3 py-2.5"><Link to={`/runs/${r.id}`} className="font-medium text-slate-100 hover:text-brand-300">{r.label ?? r.model}</Link></td>
                <td className="max-w-[180px] truncate px-3 py-2.5 text-slate-400">{r.originalName}</td>
                <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-2.5 font-mono text-xs text-slate-300">{r.metrics?.outputWidth ? `${r.metrics.outputWidth}×${r.metrics.outputHeight}` : '—'}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-slate-300">{r.quality?.consistency ? `${r.quality.consistency.psnr.toFixed(1)} / ${r.quality.consistency.ssim.toFixed(3)}` : '—'}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-slate-400">{formatDuration(r.metrics?.durationMs)}</td>
                <td className="px-3 py-2.5 text-right"><RunActions run={r} onChanged={reload} onDelete={setPending} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {error && <p className="p-4 text-sm text-rose-300">{error.message}</p>}
        {data && runs.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No runs match these filters.</p>}
      </section>

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{total} run{total === 1 ? '' : 's'} · page {page} of {pages}</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button variant="secondary" size="sm" iconRight={ChevronRight} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title="Delete this run?"
        description={`"${pending?.label ?? pending?.model}" and its output files will be removed. The original image is kept.`}
        onConfirm={async () => {
          await deleteRun(pending.id);
          notify('Run deleted');
          reload();
        }}
      />
    </main>
  );
}
