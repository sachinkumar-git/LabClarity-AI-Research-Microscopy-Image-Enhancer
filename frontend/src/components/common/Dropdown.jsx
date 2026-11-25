/**
 * Accessible dropdown menu: animated open/close, closes on outside click and Escape,
 * arrow-key navigation between items. `trigger` receives props to spread on a button.
 */
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';

export function Dropdown({ trigger, align = 'right', width = 'w-56', children }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...(menuRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') ?? [])];
        const index = items.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown' ? index + 1 : index - 1;
        items[(next + items.length) % items.length]?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const triggerProps = { 'aria-haspopup': 'menu', 'aria-expanded': open, 'aria-controls': id, onClick: () => setOpen((o) => !o) };

  return (
    <div ref={rootRef} className="relative">
      {trigger(triggerProps, open)}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            id={id}
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={`glass absolute z-40 mt-2 origin-top p-1.5 ${width} ${align === 'right' ? 'right-0' : 'left-0'}`}
          >
            {typeof children === 'function' ? children(close) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MenuItem({ icon: Icon, onSelect, close, danger = false, disabled = false, hint, children }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        onSelect?.();
        close?.();
      }}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-45
        ${danger ? 'text-rose-300 hover:bg-rose-500/10 focus:bg-rose-500/10' : 'text-slate-200 hover:bg-white/5 focus:bg-white/5'}`}
    >
      {Icon && <Icon className="size-4 shrink-0 opacity-80" aria-hidden />}
      <span className="min-w-0 flex-1">
        {children}
        {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
      </span>
    </button>
  );
}
