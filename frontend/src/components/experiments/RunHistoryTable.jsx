import { Link } from 'react-router';
import { formatDuration } from '../../utils/format.js';
import { StatusBadge } from '../common/StatusBadge.jsx';

/** Restoration history: every run with its configuration summary and headline metrics. */
export function RunHistoryTable({ runs }) {
  if (!runs.length) return <p className="text-sm text-slate-500">No runs yet. Start one from the Lab.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-xs">
        <thead>
          <tr className="text-left text-[11px] text-slate-500">
            <th className="py-2 font-medium">When</th>
            <th className="py-2 font-medium">Pipeline</th>
            <th className="py-2 font-medium">Image</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 text-right font-medium">Output</th>
            <th className="py-2 text-right font-medium">PSNR / SSIM</th>
            <th className="py-2 text-right font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-t border-line">
              <td className="py-2 pr-3 whitespace-nowrap text-slate-500">{new Date(r.createdAt).toLocaleString()}</td>
              <td className="max-w-[260px] truncate py-2 pr-3">
                <Link to={`/runs/${r.id}`} className="text-slate-200 hover:text-brand-300" title={r.label}>{r.label ?? r.model}</Link>
                {r.roi && <span className="ml-1.5 text-[10px] text-accent-400">ROI</span>}
              </td>
              <td className="max-w-[160px] truncate py-2 pr-3 text-slate-400">{r.originalName}</td>
              <td className="py-2"><StatusBadge status={r.status} /></td>
              <td className="py-2 text-right font-mono text-slate-300">{r.metrics?.outputWidth ? `${r.metrics.outputWidth}×${r.metrics.outputHeight}` : '—'}</td>
              <td className="py-2 text-right font-mono text-slate-300">
                {r.quality?.consistency ? `${r.quality.consistency.psnr.toFixed(1)} / ${r.quality.consistency.ssim.toFixed(3)}` : '—'}
              </td>
              <td className="py-2 text-right font-mono text-slate-400">{formatDuration(r.metrics?.durationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
