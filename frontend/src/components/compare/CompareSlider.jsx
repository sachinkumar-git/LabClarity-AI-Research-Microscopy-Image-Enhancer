import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import { ChevronsLeftRight } from 'lucide-react';
import { ZoomLayer } from './ZoomLayer.jsx';

const clampPct = (v) => Math.min(100, Math.max(0, v));
const DEFAULT_LABELS = { original: 'Original', enhanced: 'Processed' };

/**
 * Before/after slider. The output is the base layer; the original is clipped on top.
 * Unzoomed, dragging anywhere moves the divider (clicks glide, drags track 1:1); zoomed,
 * dragging pans and the handle moves the divider. Keyboard: arrows (Shift = 10%), Home/End.
 */
export function CompareSlider({ originalSrc, enhancedSrc, aspect, view, pixelated, crop, labels = DEFAULT_LABELS, sweep = false, className = '' }) {
  const containerRef = useRef(null);
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [gliding, setGliding] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!sweep || reduced) return undefined;
    const controls = animate(50, [50, 28, 70, 50], { duration: 2.2, delay: 0.6, ease: 'easeInOut', onUpdate: setPosition });
    return () => controls.stop();
  }, [sweep, reduced]);

  const fromPointer = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setPosition(clampPct(((clientX - rect.left) / rect.width) * 100));
  }, []);

  const startDrag = (e) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setGliding(true); // the first jump glides; subsequent moves track the pointer directly
    setDragging(true);
    fromPointer(e.clientX);
  };
  const dragProps = {
    onPointerMove: (e) => {
      if (!dragging) return;
      setGliding(false);
      fromPointer(e.clientX);
    },
    onPointerUp: () => setDragging(false),
  };
  const onKeyDown = (e) => {
    const step = e.shiftKey ? 10 : 2;
    const next = { ArrowLeft: position - step, ArrowRight: position + step, Home: 0, End: 100 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setGliding(true);
    setPosition(clampPct(next));
  };
  const glide = gliding ? 'transition-[clip-path,left] duration-300 ease-out' : '';

  return (
    <div
      ref={containerRef}
      className={`checkerboard group/slider relative w-full touch-none overflow-hidden rounded-xl select-none ${view.panning ? 'cursor-grab active:cursor-grabbing' : 'cursor-ew-resize'} ${className}`}
      style={{ aspectRatio: aspect }}
      {...(view.panning ? view.handlers : { onPointerDown: startDrag, ...dragProps })}
    >
      <ZoomLayer src={enhancedSrc} alt={labels.enhanced} transform={view.transform} />
      <div className={`absolute inset-0 ${glide}`} style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <ZoomLayer src={originalSrc} alt={labels.original} transform={view.transform} pixelated={pixelated} crop={crop} />
      </div>
      <span className="pointer-events-none absolute top-3 left-3 rounded-lg bg-black/55 px-2.5 py-1 text-xs font-medium text-[#fff] backdrop-blur">{labels.original}</span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-lg bg-black/55 px-2.5 py-1 text-xs font-semibold text-[#fff] backdrop-blur">{labels.enhanced}</span>

      <div className={`absolute inset-y-0 -ml-px w-0.5 bg-[#fff]/95 shadow-[0_0_14px_rgba(255,255,255,0.55)] ${glide}`} style={{ left: `${position}%` }}>
        <button
          type="button"
          role="slider"
          aria-label="Comparison position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position)}
          onKeyDown={onKeyDown}
          onPointerDown={startDrag}
          {...dragProps}
          className="absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full bg-[#fff] shadow-xl shadow-black/30 transition-transform duration-200 group-hover/slider:scale-105 active:scale-95"
          style={{ color: '#0f1c18' }}
        >
          <ChevronsLeftRight className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
