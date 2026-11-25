import { CheckSquare, Search, Square, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { assetUrl } from '../api/imageApi.js';
import { getRun, listAssets, listRuns } from '../api/researchApi.js';
import { ComparisonGrid } from '../components/batch/ComparisonGrid.jsx';
import { ComparisonTable } from '../components/batch/ComparisonTable.jsx';
import { Button } from '../components/common/Button.jsx';
import { Panel } from '../components/common/Panel.jsx';
import { SkeletonGrid } from '../components/common/Skeleton.jsx';
import { Reveal } from '../components/motion/Reveal.jsx';
import { useApi } from '../hooks/useApi.js';

const MAX_SELECTED = 6;

/** Pick a source image, then any of its completed runs, and compare them side by side. */
export function ComparePage() {
  const [params, setParams] = useSearchParams();
  const assetId = params.get('image') ?? '';
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const { data: assets, loading } = useApi(listAssets, 'assets');
  const { data: runs } = useApi((signal) => (assetId ? listRuns({ assetId, status: 'completed', limit: 50 }, signal) : Promise.resolve([])), assetId);
  const selectedKey = selected.join();
  const { data: details } = useApi((signal) => Promise.all(selected.map((id) => getRun(id, signal))), selectedKey);

  useEffect(() => setSelected((runs ?? []).slice(0, 3).map((r) => r.id)), [runs]);

  const q = query.trim().toLowerCase();
  const shownAssets = (assets ?? []).filter((a) => !q || a.originalName.toLowerCase().includes(q));
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX_SELECTED ? [...s, id] : s));
  const compared = details?.length === selected.length ? details : [];

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-6">
      <Reveal as="header" className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Compare</h1>
          <p className="mt-1 text-sm text-slate-400">Choose an image, then the runs to compare: synchronised zoom and pan, plus metrics side by side.</p>
        </div>
        <Button as={Link} to="/enhance" variant="secondary" icon={Wand2}>New comparison run</Button>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Panel title="1. Source image" className="h-fit">
          <label className="relative mb-3 block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search images" aria-label="Search images" className="h-9 w-full rounded-lg border border-line bg-ink-950/60 pr-3 pl-9 text-sm text-slate-100 focus:border-brand-400/60 focus:outline-none" />
          </label>
          {loading && !assets && <SkeletonGrid count={4} className="space-y-2" item="h-14" />}
          {assets?.length === 0 && <p className="text-sm text-slate-500">No images yet. <Link to="/enhance" className="text-brand-300 hover:underline">Upload one</Link>.</p>}
          <ul className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
            {shownAssets.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => setParams({ image: a.id })} aria-pressed={a.id === assetId}
                  className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-all duration-200 ${a.id === assetId ? 'border-brand-400/50 bg-brand-400/8' : 'border-transparent hover:border-line hover:bg-white/[0.03]'}`}>
                  <img src={assetUrl(a.links.preview)} alt="" className="checkerboard size-10 rounded-lg object-cover" />
                  <span className="min-w-0 truncate text-sm text-slate-200">{a.originalName}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-6">
          <Panel title="2. Runs to compare" subtitle={`Select up to ${MAX_SELECTED}`}>
            {!assetId && <p className="text-sm text-slate-500">Choose a source image on the left.</p>}
            {assetId && runs?.length === 0 && (
              <p className="text-sm text-slate-500">No completed runs for this image yet. <Link to="/enhance" className="text-brand-300 hover:underline">Run pipelines in Enhance</Link>.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {(runs ?? []).map((r) => {
                const on = selected.includes(r.id);
                const Icon = on ? CheckSquare : Square;
                return (
                  <button key={r.id} type="button" onClick={() => toggle(r.id)} aria-pressed={on}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-[0.97] ${on ? 'border-brand-400/50 bg-brand-400/10 text-brand-300' : 'border-line text-slate-300 hover:border-brand-400/30'}`}>
                    <Icon className="size-3.5" aria-hidden /> {r.label ?? r.model}
                  </button>
                );
              })}
            </div>
          </Panel>
          {compared.length > 0 && (
            <>
              <Panel title="Side-by-side"><ComparisonGrid runs={compared} /></Panel>
              <Panel title="Metrics"><ComparisonTable runs={compared} /></Panel>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
