import { Clock, Cpu, Maximize2, Scan, SwatchBook } from 'lucide-react';
import { formatDimensions, formatDuration, formatMegapixels } from '../../utils/format.js';

function Metric({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-xl border border-line bg-ink-950/40 p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase">
        <Icon className="size-3.5" aria-hidden /> {label}
      </div>
      <p className="mt-1.5 font-mono text-sm font-medium text-white">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export function MetricsGrid({ job }) {
  const m = job.metrics ?? {};
  const device = m.device === 'cuda' ? 'GPU (CUDA)' : m.device ? m.device.toUpperCase() : '—';
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Metric icon={Scan} label="Input" value={formatDimensions(m.inputWidth, m.inputHeight)} hint={formatMegapixels(m.inputWidth, m.inputHeight)} />
      <Metric icon={Maximize2} label="Output" value={formatDimensions(m.outputWidth, m.outputHeight)} hint={formatMegapixels(m.outputWidth, m.outputHeight)} />
      <Metric icon={SwatchBook} label="Bit depth" value={m.bitDepth ? `${m.bitDepth}-bit` : '—'} hint={`×${job.scale} upscale`} />
      <Metric icon={Cpu} label="Device" value={device} hint={job.model} />
      <Metric icon={Clock} label="Inference" value={formatDuration(m.durationMs)} hint="model compute time" />
    </div>
  );
}
