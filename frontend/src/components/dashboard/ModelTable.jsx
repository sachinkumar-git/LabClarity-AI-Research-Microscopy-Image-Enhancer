import { formatDuration } from '../../utils/format.js';

const fmt = (v, d) => (typeof v === 'number' ? v.toFixed(d) : '—');

/** Model performance: a table is the right form for several measures per model. */
export function ModelTable({ rows }) {
  if (!rows.length) return <p className="text-sm text-slate-500">No runs yet.</p>;
  const maxRuns = Math.max(...rows.map((r) => r.runs));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-xs">
        <thead>
          <tr className="text-left text-[11px] text-slate-500">
            <th className="py-2 font-medium">Model</th>
            <th className="py-2 font-medium">Runs</th>
            <th className="py-2 text-right font-medium">Success</th>
            <th className="py-2 text-right font-medium">Avg time</th>
            <th className="py-2 text-right font-medium">Consistency PSNR</th>
            <th className="py-2 text-right font-medium">SSIM</th>
            <th className="py-2 text-right font-medium">Noise σ reduction</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.model} className="border-t border-line">
              <td className="py-2 pr-3 font-mono text-slate-200">{r.model}</td>
              <td className="py-2 pr-3">
                <span className="flex items-center gap-2">
                  <span className="h-2 rounded-r-[4px] bg-series-1" style={{ width: `${Math.max((r.runs / maxRuns) * 80, 3)}px` }} aria-hidden />
                  <span className="font-mono text-slate-300">{r.runs}</span>
                </span>
              </td>
              <td className="py-2 text-right font-mono text-slate-300">{r.runs ? `${Math.round((r.completed / r.runs) * 100)}%` : '—'}</td>
              <td className="py-2 text-right font-mono text-slate-300">{formatDuration(r.avgDurationMs)}</td>
              <td className="py-2 text-right font-mono text-slate-300">{fmt(r.avgPsnr, 2)}</td>
              <td className="py-2 text-right font-mono text-slate-300">{fmt(r.avgSsim, 4)}</td>
              <td className="py-2 text-right font-mono text-slate-300">{fmt(r.avgNoiseReduction, 4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-slate-500">Averages over completed runs. Consistency is agreement with the input, not ground-truth fidelity.</p>
    </div>
  );
}
