import { useRef, useState } from 'react';
import { Columns2, Flame, Grid3x3, Maximize2, Minimize2, RotateCcw, SquareSplitHorizontal } from 'lucide-react';
import { useFullscreen } from '../../hooks/useFullscreen.js';
import { useZoomPan } from '../../hooks/useZoomPan.js';
import { Tooltip } from '../common/Tooltip.jsx';
import { SegmentedControl } from '../common/SegmentedControl.jsx';
import { CompareSlider } from './CompareSlider.jsx';
import { DifferenceView } from './DifferenceView.jsx';
import { SideBySide } from './SideBySide.jsx';

const ZOOMS = [1, 2, 4, 8].map((z) => ({ value: z, label: `${z}×` }));

/** Comparison toolbar + viewer with synchronised zoom and drag-to-pan in every mode. */
export function CompareViewer({ originalSrc, enhancedSrc, diffSrc, diffStats, width, height, crop, labels }) {
  const modes = [
    { value: 'slider', label: 'Slider', icon: SquareSplitHorizontal },
    { value: 'side', label: 'Side by side', icon: Columns2 },
    ...(diffSrc ? [{ value: 'diff', label: 'Difference', icon: Flame }] : []),
  ];
  const [mode, setMode] = useState('slider');
  const [pixelated, setPixelated] = useState(true);
  const view = useZoomPan();
  const rootRef = useRef(null);
  const fs = useFullscreen(rootRef);
  const aspect = width && height ? `${width} / ${height}` : '4 / 3';
  const shared = { originalSrc, enhancedSrc, aspect, view, pixelated, crop };

  return (
    <div ref={rootRef} className={`animate-fade-in space-y-4 ${fs.isFullscreen ? 'overflow-auto bg-ink-950 p-6' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl label="Comparison mode" options={modes} value={mode} onChange={setMode} size="sm" />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={pixelated}
            onClick={() => setPixelated((p) => !p)}
            title="Show the original's true pixels instead of browser smoothing"
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition
              ${pixelated ? 'border-brand-400/40 bg-brand-400/10 text-brand-300' : 'border-line text-slate-400 hover:text-slate-200'}`}
          >
            <Grid3x3 className="size-3.5" aria-hidden /> True pixels
          </button>
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

      {mode === 'slider' && <CompareSlider {...shared} />}
      {mode === 'side' && <SideBySide {...shared} labels={labels} />}
      {mode === 'diff' && <DifferenceView enhancedSrc={enhancedSrc} diffSrc={diffSrc} aspect={aspect} view={view} stats={diffStats} />}
      {view.panning && <p className="text-center text-xs text-slate-500">Drag the image to pan · views stay synchronised</p>}
    </div>
  );
}
