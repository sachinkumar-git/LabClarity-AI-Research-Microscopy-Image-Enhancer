import { Clock, Cpu, Image, Layers } from 'lucide-react';
import { formatDuration } from '../../utils/format.js';
import { CountUp } from '../motion/CountUp.jsx';
import { Stagger, StaggerItem } from '../motion/Reveal.jsx';
import { Skeleton } from '../common/Skeleton.jsx';

function Stat({ icon: Icon, tint, value, label, format }) {
  return (
    <StaggerItem className="card-interactive flex items-center gap-3 rounded-2xl border border-line bg-ink-900/60 p-4">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tint}`}><Icon className="size-5" aria-hidden /></span>
      <span className="min-w-0">
        <span className="block font-mono text-xl font-bold text-white"><CountUp value={value} format={format} /></span>
        <span className="block text-xs leading-tight text-slate-500">{label}</span>
      </span>
    </StaggerItem>
  );
}

/** Headline numbers: a number (not a chart) is the right form for each of these. */
export function QuickStats({ stats }) {
  return (
    <section className="glass p-5">
      <header className="mb-4 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-400/10 text-brand-400"><Layers className="size-5" aria-hidden /></span>
        <h2 className="text-base font-semibold text-white">Quick Stats</h2>
      </header>
      {!stats ? (
        <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[76px]" />)}</div>
      ) : (
        <Stagger className="grid grid-cols-2 gap-3">
          <Stat icon={Image} tint="bg-emerald-500/10 text-emerald-400" value={stats.totals.completed} label="Images processed" />
          <Stat icon={Layers} tint="bg-brand-400/10 text-brand-400" value={stats.totals.experiments} label="Active projects" />
          <Stat icon={Cpu} tint="bg-emerald-500/10 text-emerald-400" value={stats.modelsUsed} label="Models used" />
          <Stat
            icon={Clock} tint="bg-amber-500/12 text-amber-400" label="Avg. processing time"
            value={stats.avgDurationMs ?? undefined} format={(v) => formatDuration(v)}
          />
        </Stagger>
      )}
    </section>
  );
}
