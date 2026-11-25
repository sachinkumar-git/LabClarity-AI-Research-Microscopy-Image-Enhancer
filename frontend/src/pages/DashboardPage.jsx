import { Cpu, FlaskConical, Images, ListChecks } from 'lucide-react';
import { getStats } from '../api/researchApi.js';
import { Alert } from '../components/common/Alert.jsx';
import { PageSkeleton } from '../components/common/Skeleton.jsx';
import { CountUp } from '../components/motion/CountUp.jsx';
import { Reveal, Stagger, StaggerItem } from '../components/motion/Reveal.jsx';
import { Panel } from '../components/common/Panel.jsx';
import { ModelTable } from '../components/dashboard/ModelTable.jsx';
import { TimelineChart } from '../components/dashboard/TimelineChart.jsx';
import { UsageBars } from '../components/dashboard/UsageBars.jsx';
import { RunHistoryTable } from '../components/experiments/RunHistoryTable.jsx';
import { useApi } from '../hooks/useApi.js';

function Tile({ icon: Icon, label, value, hint, format }) {
  return (
    <StaggerItem className="glass card-interactive p-5">
      <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-slate-400 uppercase">
        <Icon className="size-4 text-brand-400" aria-hidden /> {label}
      </p>
      <p className="mt-2 font-mono text-3xl font-semibold text-white">{typeof value === 'number' ? <CountUp value={value} format={format} /> : value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </StaggerItem>
  );
}

export function DashboardPage() {
  const { data: s, error } = useApi(getStats, 'stats');
  if (error) return <main className="mx-auto max-w-3xl px-4 py-16"><Alert tone="error">{error.message}</Alert></main>;
  if (!s) return <PageSkeleton />;
  const t = s.totals;
  const devices = s.devices.map((d) => `${d.runs} run${d.runs === 1 ? '' : 's'} on ${d.device.toUpperCase()}`).join(' · ') || 'no runs yet';

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-6">
      <Reveal as="header">
        <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Processing statistics, model performance and project activity.</p>
      </Reveal>
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile icon={FlaskConical} label="Projects" value={t.experiments} />
        <Tile icon={Images} label="Source images" value={t.images} hint="originals stored read-only" />
        <Tile icon={ListChecks} label="Runs" value={t.runs} hint={`${t.queued + t.processing} in progress · ${t.failed} failed`} />
        <Tile icon={Cpu} label="Success rate" value={s.successRate == null ? '—' : s.successRate * 100} format={(v) => `${Math.round(v)}%`} hint={devices} />
      </Stagger>
      <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Runs per day" subtitle="Last 14 days"><TimelineChart days={s.timeline} /></Panel>
        <Panel title="Operations used" subtitle="Pipeline steps across all runs"><UsageBars items={s.operations} /></Panel>
      </Reveal>
      <Reveal><Panel title="Model performance"><ModelTable rows={s.byModel} /></Panel></Reveal>
      <Reveal><Panel title="Recent runs"><RunHistoryTable runs={s.recent} /></Panel></Reveal>
    </main>
  );
}
