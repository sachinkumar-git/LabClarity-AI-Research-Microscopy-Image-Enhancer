import { ZoomLayer } from './ZoomLayer.jsx';

export function Pane({ label, highlight, aspect, view, children }) {
  return (
    <figure className="min-w-0 flex-1">
      <div
        className={`checkerboard relative w-full touch-none overflow-hidden rounded-xl ring-1 ring-white/10 ${view?.panning ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ aspectRatio: aspect }}
        {...(view?.handlers ?? {})}
      >
        {children}
      </div>
      <figcaption className={`mt-2 truncate text-center text-xs font-medium ${highlight ? 'text-brand-300' : 'text-slate-400'}`} title={label}>
        {label}
      </figcaption>
    </figure>
  );
}

/** Synchronised side-by-side panes: one zoom/pan state drives both. */
export function SideBySide({ originalSrc, enhancedSrc, aspect, view, pixelated, crop, labels }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <Pane label={labels.original} aspect={aspect} view={view}>
        <ZoomLayer src={originalSrc} alt="Original" transform={view.transform} pixelated={pixelated} crop={crop} />
      </Pane>
      <Pane label={labels.enhanced} aspect={aspect} view={view} highlight>
        <ZoomLayer src={enhancedSrc} alt="Processed output" transform={view.transform} />
      </Pane>
    </div>
  );
}
