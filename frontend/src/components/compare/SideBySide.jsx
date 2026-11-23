import { ZoomLayer } from './ZoomLayer.jsx';

function Pane({ label, highlight, aspect, children }) {
  return (
    <figure className="min-w-0 flex-1">
      <div className="checkerboard relative w-full overflow-hidden rounded-xl ring-1 ring-white/10" style={{ aspectRatio: aspect }}>
        {children}
      </div>
      <figcaption className={`mt-2 text-center text-xs font-medium ${highlight ? 'text-brand-300' : 'text-slate-400'}`}>
        {label}
      </figcaption>
    </figure>
  );
}

/** Synchronised side-by-side panes: zoom and pan apply to both at once. */
export function SideBySide({ originalSrc, enhancedSrc, aspect, zoom, origin, pixelated, labels }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <Pane label={labels.original} aspect={aspect}>
        <ZoomLayer src={originalSrc} alt="Original" zoom={zoom} origin={origin} pixelated={pixelated} />
      </Pane>
      <Pane label={labels.enhanced} aspect={aspect} highlight>
        <ZoomLayer src={enhancedSrc} alt="Enhanced" zoom={zoom} origin={origin} />
      </Pane>
    </div>
  );
}
