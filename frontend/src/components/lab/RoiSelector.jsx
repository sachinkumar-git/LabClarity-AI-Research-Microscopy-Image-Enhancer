import { useRef, useState } from 'react';
import { Crop, X } from 'lucide-react';

const MIN_SIZE = 16;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Drag a rectangle on the preview to select a region of interest. Coordinates are converted
 * to source-image pixels (the server validates them again before processing).
 */
export function RoiSelector({ src, width, height, roi, onChange }) {
  const imgRef = useRef(null);
  const [drag, setDrag] = useState(null);

  const toImage = (e) => {
    const rect = imgRef.current.getBoundingClientRect();
    return {
      x: clamp(Math.round(((e.clientX - rect.left) / rect.width) * width), 0, width),
      y: clamp(Math.round(((e.clientY - rect.top) / rect.height) * height), 0, height),
    };
  };
  const toRoi = (a, b) => ({
    x: Math.min(a.x, b.x), y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y),
  });

  const finish = (e) => {
    if (!drag) return;
    const next = toRoi(drag.start, toImage(e));
    setDrag(null);
    if (next.width >= MIN_SIZE && next.height >= MIN_SIZE) onChange(next);
  };

  const shown = drag ? toRoi(drag.start, drag.current) : roi;
  const pct = (v, total) => `${(v / total) * 100}%`;

  return (
    <div className="space-y-2">
      <div
        className="checkerboard relative cursor-crosshair touch-none overflow-hidden rounded-lg ring-1 ring-white/10 select-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = toImage(e);
          setDrag({ start: p, current: p });
        }}
        onPointerMove={(e) => drag && setDrag({ ...drag, current: toImage(e) })}
        onPointerUp={finish}
      >
        <img ref={imgRef} src={src} alt="Select a region of interest" draggable={false} className="block h-auto w-full" />
        {shown && shown.width > 0 && (
          <div
            className="pointer-events-none absolute border-2 border-brand-300 bg-brand-400/10 shadow-[0_0_0_9999px_rgba(5,8,15,0.55)]"
            style={{ left: pct(shown.x, width), top: pct(shown.y, height), width: pct(shown.width, width), height: pct(shown.height, height) }}
          />
        )}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-mono text-slate-400">
          <Crop className="size-3.5" aria-hidden />
          {roi ? `x ${roi.x}, y ${roi.y} · ${roi.width}×${roi.height} px` : 'Drag on the image to process only a region (min 16×16 px)'}
        </span>
        {roi && (
          <button type="button" onClick={() => onChange(null)} className="flex items-center gap-1 text-slate-400 hover:text-white">
            <X className="size-3.5" /> Full image
          </button>
        )}
      </div>
    </div>
  );
}
