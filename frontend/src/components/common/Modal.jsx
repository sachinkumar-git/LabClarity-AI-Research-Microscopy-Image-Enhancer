/** Accessible modal dialog: focus moves in, Escape/backdrop closes, focus returns on close. */
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

export function Modal({ open, onClose, title, description, children, footer, width = 'max-w-lg' }) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => panelRef.current?.querySelector('input, select, textarea, button')?.focus(), 30);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-slate-100/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`glass relative w-full ${width} bg-ink-900 p-6`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="text-lg font-semibold text-white">{title}</h2>
                {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
              </div>
              <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white" aria-label="Close dialog">
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-5">{children}</div>
            {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
