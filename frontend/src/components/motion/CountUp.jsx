/** Animates a number from 0 to `value` when it first scrolls into view. */
import { animate, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

export function CountUp({ value, format = (v) => Math.round(v).toLocaleString(), duration = 0.9 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || typeof value !== 'number') return undefined;
    if (reduced) {
      setDisplay(value);
      return undefined;
    }
    const controls = animate(0, value, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: setDisplay });
    return () => controls.stop();
  }, [inView, value, reduced, duration]);

  return <span ref={ref}>{typeof value === 'number' ? format(display) : '—'}</span>;
}
