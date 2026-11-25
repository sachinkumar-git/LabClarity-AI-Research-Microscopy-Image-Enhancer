import { Search } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../components/common/Alert.jsx';
import { SegmentedControl } from '../components/common/SegmentedControl.jsx';
import { SkeletonGrid } from '../components/common/Skeleton.jsx';
import { ModelCard } from '../components/models/ModelCard.jsx';
import { Reveal, Stagger, StaggerItem } from '../components/motion/Reveal.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { OP_LABELS } from '../utils/pipeline.js';

const TASKS = [
  { value: 'all', label: 'All' },
  { value: 'super_resolution', label: 'Super-resolution' },
  { value: 'denoise', label: 'Denoising' },
];

export function ModelsPage() {
  const { models, operations, runtime, loading, error } = useCatalog();
  const [task, setTask] = useState('all');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = models.filter((m) => (task === 'all' || m.task === task)
    && (!q || `${m.name} ${m.description} ${m.id}`.toLowerCase().includes(q)));
  const ready = models.filter((m) => m.available).length;

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-6">
      <Reveal as="header">
        <h1 className="text-3xl font-bold tracking-tight text-white">Model Library</h1>
        <p className="mt-1 text-sm text-slate-400">
          {ready} of {models.length} models ready on this server · running on {runtime ? (runtime.device === 'cuda' ? runtime.gpu || 'GPU' : 'CPU') : '…'}.
          Models are integrated through spandrel; adding one is a single catalogue entry.
        </p>
      </Reveal>
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl label="Filter by task" options={TASKS} value={task} onChange={setTask} size="sm" />
        <label className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search models" aria-label="Search models" className="h-10 w-full rounded-xl border border-line bg-ink-900/70 pr-3 pl-9 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400/60 focus:outline-none" />
        </label>
      </div>
      {error && <Alert tone="error" title="Model catalogue unavailable">{error.message}</Alert>}
      {loading ? <SkeletonGrid count={6} item="h-56" /> : (
        <Stagger key={`${task}-${q}`} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((m) => <ModelCard key={m.id} model={m} />)}
        </Stagger>
      )}
      {!loading && shown.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No models match “{query}”.</p>}

      <section className="pt-6">
        <Reveal as="h2" className="text-xl font-semibold text-white">Classical operations</Reveal>
        <p className="mt-1 text-sm text-slate-400">Always available, no weights required. Combine them with AI models in any pipeline.</p>
        <Stagger className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {operations.map((op) => (
            <StaggerItem key={op.op} className="glass p-5">
              <h3 className="font-semibold text-white">{OP_LABELS[op.op] ?? op.label}</h3>
              <ul className="mt-2 space-y-1 text-xs text-slate-400">
                {Object.values(op.methods ?? { model: 'Uses a super-resolution model (see above)' }).map((label) => <li key={label}>• {label}</li>)}
              </ul>
              {op.warning && <p className="mt-2 text-xs text-amber-300">{op.warning}</p>}
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </main>
  );
}
