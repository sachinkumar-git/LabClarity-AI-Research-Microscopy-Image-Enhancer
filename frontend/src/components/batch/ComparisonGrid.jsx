import { useRef } from 'react';
import { Link } from 'react-router';
import { Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { useFullscreen } from '../../hooks/useFullscreen.js';
import { Tooltip } from '../common/Tooltip.jsx';
import { assetUrl } from '../../api/imageApi.js';
import { useZoomPan } from '../../hooks/useZoomPan.js';
import { SegmentedControl } from '../common/SegmentedControl.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { Pane } from '../compare/SideBySide.jsx';
import { ZoomLayer } from '../compare/ZoomLayer.jsx';

const ZOOMS = [1, 2, 4, 8].map((z) => ({ value: z, label: `${z}×` }));

/** Original + every run's output on one synchronised zoom/pan: multi-model comparison. */
export function ComparisonGrid({ runs }) {
  const view = useZoomPan();
  const rootRef = useRef(null);
  const fs = useFullscreen(rootRef);
  const first = runs.find((r) => r.status === 'completed');
  if (!first) return null;
  const m = first.metrics ?? {};
  const aspect = m.outputWidth ? `${m.outputWidth} / ${m.outputHeight}` : '4 / 3';
  const crop = first.roi && first.audit?.input
    ? { ...first.roi, fullWidth: first.audit.input.width, fullHeight: first.audit.input.height }
    : null;

  return (
    <div ref={rootRef} className={`space-y-4 ${fs.isFullscreen ? 'overflow-auto bg-ink-950 p-6' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">All panes share one viewport{view.panning ? ' · drag any pane to pan' : ''}.</p>
        <div className="flex items-center gap-2">
          <SegmentedControl label="Zoom" options={ZOOMS} value={view.zoom} onChange={view.setZoom} size="sm" />
          <Tooltip label="Reset zoom and pan">
            <button type="button" onClick={view.reset} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white active:scale-95" aria-label="Reset view">
              <RotateCcw className="size-3.5" />
            </button>
          </Tooltip>
          {fs.supported && (
            <Tooltip label={fs.isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}>
              <button type="button" onClick={fs.toggle} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white active:scale-95" aria-label={fs.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
                {fs.isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              </button>
            </Tooltip>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Pane label={`Original · ${first.originalName}`} aspect={aspect} view={view}>
          <ZoomLayer src={assetUrl(first.links.preview)} alt="Original" transform={view.transform} pixelated crop={crop} />
        </Pane>
        {runs.map((run) => (
          <div key={run.id} className="min-w-0">
            {run.status === 'completed' ? (
              <Pane label={run.label ?? run.model} aspect={aspect} view={view} highlight>
                <ZoomLayer src={assetUrl(run.links.enhanced)} alt={run.label ?? run.model} transform={view.transform} />
              </Pane>
            ) : (
              <div className="grid place-items-center rounded-xl border border-dashed border-line text-xs text-slate-500" style={{ aspectRatio: aspect }}>
                <StatusBadge status={run.status} />
              </div>
            )}
            <Link to={`/runs/${run.id}`} className="mt-1 block text-center text-[11px] text-slate-500 hover:text-brand-300">Open details →</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
