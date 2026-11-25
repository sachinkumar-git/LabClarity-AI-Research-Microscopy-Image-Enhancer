/**
 * Shared zoom + drag-to-pan state. One instance can drive any number of image layers,
 * which keeps slider, side-by-side and multi-model grids perfectly synchronised.
 */
import { useCallback, useRef, useState } from 'react';

const clamp = (v, limit) => Math.min(limit, Math.max(-limit, v));

export function useZoomPan() {
  const [zoom, setZoomState] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // percent of the element size
  const dragRef = useRef(null);

  const limitFor = (z) => ((z - 1) / 2 / z) * 100;

  const setZoom = useCallback((z) => {
    setZoomState(z);
    setPan((p) => ({ x: clamp(p.x, limitFor(z)), y: clamp(p.y, limitFor(z)) }));
  }, []);

  const reset = useCallback(() => {
    setZoomState(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handlers = {
    onPointerDown: (e) => {
      if (zoom === 1) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const rect = e.currentTarget.getBoundingClientRect();
      dragRef.current = { x: e.clientX, y: e.clientY, pan, width: rect.width, height: rect.height };
    },
    onPointerMove: (e) => {
      const d = dragRef.current;
      if (!d) return;
      const limit = limitFor(zoom);
      setPan({
        x: clamp(d.pan.x + ((e.clientX - d.x) / d.width / zoom) * 100, limit),
        y: clamp(d.pan.y + ((e.clientY - d.y) / d.height / zoom) * 100, limit),
      });
    },
    onPointerUp: () => {
      dragRef.current = null;
    },
  };

  // scale first, then translate in the scaled coordinate space (percent of element size)
  const transform = `scale(${zoom}) translate(${pan.x}%, ${pan.y}%)`;
  return { zoom, setZoom, pan, reset, transform, handlers, panning: zoom > 1 };
}
