/**
 * Lightweight tooltip for icon controls. Shows on hover and keyboard focus after a short delay;
 * the label is also exposed via aria-describedby so it is never hover-only information.
 */
import { AnimatePresence, motion } from 'motion/react';
import { useId, useRef, useState } from 'react';

const PLACEMENT = {
  bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
  top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
  left: 'right-full mr-2 top-1/2 -translate-y-1/2',
};

export function Tooltip({ label, side = 'bottom', children }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const show = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), 250);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };

  return (
    <span className="relative inline-flex" onPointerEnter={show} onPointerLeave={hide} onFocus={show} onBlur={hide} aria-describedby={id}>
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className={`pointer-events-none absolute z-50 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium whitespace-nowrap text-ink-900 shadow-lg ${PLACEMENT[side]}`}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {!open && <span id={id} className="sr-only">{label}</span>}
    </span>
  );
}
