import { useState } from 'react';
import { Columns2, Grid3x3, SquareSplitHorizontal } from 'lucide-react';
import { SegmentedControl } from '../common/SegmentedControl.jsx';
import { CompareSlider } from './CompareSlider.jsx';
import { SideBySide } from './SideBySide.jsx';

const MODES = [
  { value: 'slider', label: 'Slider', icon: SquareSplitHorizontal },
  { value: 'side', label: 'Side by side', icon: Columns2 },
];
const ZOOMS = [1, 2, 4, 8].map((z) => ({ value: z, label: `${z}×` }));

/** Comparison toolbar + viewer. When zoomed, moving the pointer pans the magnified region. */
export function CompareViewer({ originalSrc, enhancedSrc, width, height, labels }) {
  const [mode, setMode] = useState('slider');
  const [zoom, setZoom] = useState(1);
  const [origin, setOrigin] = useState('50% 50%');
  const [pixelated, setPixelated] = useState(true);
  const aspect = width && height ? `${width} / ${height}` : '4 / 3';

  const onPointerMove = (e) => {
    if (zoom === 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${Math.min(100, Math.max(0, x))}% ${Math.min(100, Math.max(0, y))}%`);
  };

  const shared = { originalSrc, enhancedSrc, aspect, zoom, origin, pixelated };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl label="Comparison mode" options={MODES} value={mode} onChange={setMode} size="sm" />
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
          <SegmentedControl label="Zoom" options={ZOOMS} value={zoom} onChange={setZoom} size="sm" />
        </div>
      </div>

      <div onPointerMove={onPointerMove} className={zoom > 1 ? 'cursor-crosshair' : ''}>
        {mode === 'slider' ? <CompareSlider {...shared} /> : <SideBySide {...shared} labels={labels} />}
      </div>
      {zoom > 1 && <p className="text-center text-xs text-slate-500">Move the pointer over the image to pan.</p>}
    </div>
  );
}
