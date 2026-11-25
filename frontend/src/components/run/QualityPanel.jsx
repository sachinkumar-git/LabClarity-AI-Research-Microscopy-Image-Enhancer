import { Info, TriangleAlert } from 'lucide-react';

const fmt = (v, d = 3) => (typeof v === 'number' ? v.toFixed(d) : '—');
const NR_ROWS = [
  ['noiseSigma', 'Noise σ', 4, 'lower'],
  ['sharpness', 'Sharpness', 4, 'higher'],
  ['rmsContrast', 'RMS contrast', 3, null],
  ['entropy', 'Entropy (bits)', 2, null],
];

function Score({ label, psnr, ssim, method }) {
  return (
    <div className="rounded-xl border border-line bg-ink-950/40 p-3">
      <p className="text-[11px] tracking-wide text-slate-500 uppercase">{label}</p>
      <div className="mt-1 flex items-baseline gap-4 font-mono">
        <span className="text-lg text-white">{fmt(psnr, 2)}<span className="ml-1 text-xs text-slate-500">dB PSNR</span></span>
        <span className="text-lg text-white">{fmt(ssim, 4)}<span className="ml-1 text-xs text-slate-500">SSIM</span></span>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">{method}</p>
    </div>
  );
}

/** Quality metrics with explicit method labels, so no number is read out of context. */
export function QualityPanel({ quality }) {
  if (!quality) return <p className="text-sm text-slate-500">Quality metrics are not available for this run.</p>;
  const { consistency, reference, noReference: nr } = quality;
  return (
    <div className="space-y-3">
      {consistency && <Score label="Consistency with input" {...consistency} />}
      {consistency?.note && (
        <p className="flex gap-1.5 text-[11px] text-amber-200/90"><TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />{consistency.note}</p>
      )}
      {reference && !reference.skipped && <Score label="Ground-truth reference" {...reference} />}
      {reference?.skipped && <p className="text-[11px] text-slate-500">Reference metrics skipped: {reference.skipped}</p>}
      {!reference && (
        <p className="flex gap-1.5 text-[11px] text-slate-500">
          <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
          No ground truth was supplied, so true fidelity cannot be measured. Consistency shows agreement with the measured data, not that added detail is real.
        </p>
      )}
      {nr?.input && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[11px] text-slate-500">
              <th className="py-1 font-medium">No-reference ({nr.measuredAt})</th>
              <th className="py-1 text-right font-medium">Input</th>
              <th className="py-1 text-right font-medium">Output</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {NR_ROWS.map(([key, label, digits, better]) => {
              const delta = nr.output[key] - nr.input[key];
              const improved = better === 'lower' ? delta < 0 : better === 'higher' ? delta > 0 : null;
              return (
                <tr key={key} className="border-t border-line">
                  <td className="py-1.5 font-sans text-slate-300">{label}</td>
                  <td className="py-1.5 text-right text-slate-400">{fmt(nr.input[key], digits)}</td>
                  <td className={`py-1.5 text-right ${improved === null ? 'text-slate-200' : improved ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {fmt(nr.output[key], digits)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
