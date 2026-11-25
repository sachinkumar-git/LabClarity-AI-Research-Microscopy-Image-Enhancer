import { Lightbulb, TriangleAlert } from 'lucide-react';
import { describeStep } from '../../utils/pipeline.js';

function Metric({ label, value, hint, flag }) {
  return (
    <div className={`rounded-lg px-2 py-1.5 ring-1 ${flag ? 'bg-amber-400/5 ring-amber-400/30' : 'bg-white/[0.03] ring-white/5'}`} title={hint}>
      <p className="text-[10px] tracking-wide text-slate-500 uppercase">{label}</p>
      <p className={`font-mono text-xs ${flag ? 'text-amber-200' : 'text-slate-200'}`}>{value}</p>
    </div>
  );
}

/** Measured degradation metrics + the explained, rule-based recommendation. */
export function AnalysisSummary({ analysis, recommendation }) {
  if (!analysis) return <p className="text-xs text-slate-500">Analysis unavailable for this image.</p>;
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-4 gap-1.5">
        <Metric label="Noise σ" value={analysis.noiseSigma.toFixed(3)} flag={analysis.noiseSigma > 0.02} hint="Estimated Gaussian noise (Immerkær)" />
        <Metric label="Sharpness" value={analysis.sharpness.toFixed(4)} flag={analysis.sharpness < 0.004} hint="Noise-compensated high-frequency energy" />
        <Metric label="Contrast" value={analysis.rmsContrast.toFixed(3)} flag={analysis.rmsContrast < 0.05} hint="RMS contrast" />
        <Metric label="Range use" value={`${Math.round(analysis.dynamicRangeUse * 100)}%`} flag={analysis.dynamicRangeUse < 0.2} hint="Share of the bit depth actually used" />
      </div>
      {recommendation && (
        <div className="rounded-lg border border-brand-400/20 bg-brand-400/5 p-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-300">
            <Lightbulb className="size-3.5" aria-hidden /> Recommended: {recommendation.steps.map(describeStep).join(' → ')}
          </p>
          <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-slate-400">
            {recommendation.reasons.map((r) => <li key={r.op + r.reason}>• {r.reason}</li>)}
          </ul>
          {recommendation.warnings.map((w) => (
            <p key={w} className="mt-1.5 flex gap-1.5 text-[11px] text-amber-200/90">
              <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden /> {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
