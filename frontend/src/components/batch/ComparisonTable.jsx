import { Link } from 'react-router';
import { formatDuration } from '../../utils/format.js';
import { StatusBadge } from '../common/StatusBadge.jsx';

const COLUMNS = [
  { key: 'psnr', label: 'Consistency PSNR', get: (r) => r.quality?.consistency?.psnr, better: 'max', digits: 2 },
  { key: 'ssim', label: 'SSIM', get: (r) => r.quality?.consistency?.ssim, better: 'max', digits: 4 },
  { key: 'refPsnr', label: 'GT PSNR', get: (r) => r.quality?.reference?.psnr, better: 'max', digits: 2 },
  { key: 'noise', label: 'Noise σ out', get: (r) => r.quality?.noReference?.output?.noiseSigma, better: 'min', digits: 4 },
  // No "best" for sharpness: residual noise and synthesised texture also raise it.
  { key: 'sharp', label: 'Sharpness out', get: (r) => r.quality?.noReference?.output?.sharpness, better: null, digits: 4 },
  { key: 'time', label: 'Compute', get: (r) => r.metrics?.durationMs, better: 'min', format: formatDuration },
];

function bestValues(runs) {
  return Object.fromEntries(COLUMNS.map((c) => {
    const values = runs.map(c.get).filter((v) => typeof v === 'number');
    if (!c.better || values.length < 2) return [c.key, null];
    return [c.key, c.better === 'max' ? Math.max(...values) : Math.min(...values)];
  }));
}

/** Side-by-side metrics for every run; the best value per column is highlighted. */
export function ComparisonTable({ runs }) {
  const best = bestValues(runs);
  const showGt = runs.some((r) => typeof r.quality?.reference?.psnr === 'number');
  const columns = COLUMNS.filter((c) => c.key !== 'refPsnr' || showGt);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-xs">
        <thead>
          <tr className="text-left text-[11px] text-slate-500">
            <th className="py-2 font-medium">Run</th>
            <th className="py-2 font-medium">Image</th>
            <th className="py-2 font-medium">Status</th>
            {columns.map((c) => <th key={c.key} className="py-2 text-right font-medium">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-t border-line">
              <td className="max-w-[220px] truncate py-2 pr-3">
                <Link to={`/runs/${run.id}`} className="text-slate-200 hover:text-brand-300" title={run.label}>{run.label ?? run.model}</Link>
              </td>
              <td className="max-w-[140px] truncate py-2 pr-3 text-slate-400">{run.originalName}</td>
              <td className="py-2"><StatusBadge status={run.status} /></td>
              {columns.map((c) => {
                const v = c.get(run);
                const isBest = typeof v === 'number' && v === best[c.key];
                return (
                  <td key={c.key} className={`py-2 text-right font-mono ${isBest ? 'font-semibold text-emerald-300' : 'text-slate-300'}`}>
                    {typeof v === 'number' ? (c.format ? c.format(v) : v.toFixed(c.digits)) : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-slate-500">
        Highlighted = best in column. Consistency rewards agreement with the degraded input, so denoising pipelines
        score lower by design; GT PSNR (when a reference is supplied) is the true fidelity measure.
      </p>
    </div>
  );
}
