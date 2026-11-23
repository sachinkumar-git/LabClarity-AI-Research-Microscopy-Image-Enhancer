import { useCallback, useRef, useState } from 'react';
import { ChevronsLeftRight } from 'lucide-react';
import { ZoomLayer } from './ZoomLayer.jsx';

/**
 * Before/after slider. The enhanced image is the base layer; the original is
 * clipped on top. Pointer, touch and keyboard (←/→, Home/End) are supported.
 */
export function CompareSlider({ originalSrc, enhancedSrc, aspect, zoom, origin, pixelated }) {
  const containerRef = useRef(null);
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);

  const updateFromPointer = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  const onKeyDown = (e) => {
    const step = e.shiftKey ? 10 : 2;
    const next = { ArrowLeft: position - step, ArrowRight: position + step, Home: 0, End: 100 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setPosition(Math.min(100, Math.max(0, next)));
  };

  return (
    <div
      ref={containerRef}
      className="checkerboard relative w-full touch-none overflow-hidden rounded-xl select-none"
      style={{ aspectRatio: aspect }}
      onPointerDown={(e) => {
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        updateFromPointer(e.clientX);
      }}
      onPointerMove={(e) => dragging && updateFromPointer(e.clientX)}
      onPointerUp={() => setDragging(false)}
    >
      <ZoomLayer src={enhancedSrc} alt="Enhanced" zoom={zoom} origin={origin} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <ZoomLayer src={originalSrc} alt="Original" zoom={zoom} origin={origin} pixelated={pixelated} />
      </div>

      <span className="pointer-events-none absolute top-3 left-3 rounded-md bg-ink-950/80 px-2 py-1 text-[11px] font-medium text-slate-200 backdrop-blur">
        Original
      </span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-md bg-brand-400/90 px-2 py-1 text-[11px] font-semibold text-ink-950">
        Enhanced
      </span>

      <div className="absolute inset-y-0 -ml-px w-0.5 bg-white/90 shadow-[0_0_12px_rgba(34,211,238,0.8)]" style={{ left: `${position}%` }}>
        <button
          type="button"
          role="slider"
          aria-label="Comparison position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position)}
          onKeyDown={onKeyDown}
          className="absolute top-1/2 left-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full border-2 border-white bg-ink-950/80 text-white shadow-xl backdrop-blur transition-transform hover:scale-110"
        >
          <ChevronsLeftRight className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
