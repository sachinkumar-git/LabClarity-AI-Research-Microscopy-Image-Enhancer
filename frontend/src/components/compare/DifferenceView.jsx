import { useState } from 'react';
import { ZoomLayer } from './ZoomLayer.jsx';

const LEGEND = 'linear-gradient(90deg, rgb(0,0,4), rgb(87,16,110), rgb(188,55,84), rgb(249,142,9), rgb(252,255,164))';

/** Difference heatmap blended over the processed output, with an explanatory legend. */
export function DifferenceView({ enhancedSrc, diffSrc, aspect, view, stats }) {
  const [opacity, setOpacity] = useState(0.85);
  return (
    <div className="space-y-3">
      <div
        className={`checkerboard relative w-full touch-none overflow-hidden rounded-xl ring-1 ring-white/10 ${view.panning ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ aspectRatio: aspect }}
        {...view.handlers}
      >
        <ZoomLayer src={enhancedSrc} alt="Processed output" transform={view.transform} />
        <div className="absolute inset-0" style={{ opacity }}>
          <ZoomLayer src={diffSrc} alt="Difference heatmap" transform={view.transform} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>0</span>
          <span className="h-2 w-32 rounded-full" style={{ background: LEGEND }} aria-hidden />
          <span>p99.5 |Δ|</span>
        </div>
        <label className="flex items-center gap-2">
          Overlay
          <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="h-1 w-28 accent-cyan-400" />
        </label>
        {stats && (
          <span className="font-mono text-[11px]">
            mean |Δ| {stats.meanAbsDiff} · changed {(stats.changedFraction * 100).toFixed(1)}% of pixels
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-500">
        Shows where processing departs from a plain bicubic upscale of the input. Bright areas were altered most;
        inspect them for removed noise, sharpened edges or synthesised texture.
      </p>
    </div>
  );
}
