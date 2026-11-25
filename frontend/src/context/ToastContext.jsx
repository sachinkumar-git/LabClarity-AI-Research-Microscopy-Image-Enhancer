/** Transient feedback for completed (or failed) actions. Only shown for real outcomes. */
import { AnimatePresence, motion } from 'motion/react';
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);
const ICONS = { success: CircleCheck, error: TriangleAlert, info: Info };
const TONES = {
  success: 'text-emerald-300',
  error: 'text-rose-300',
  info: 'text-brand-300',
};
let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const notify = useCallback((message, tone = 'success') => {
    const id = (nextId += 1);
    setToasts((t) => [...t.slice(-3), { id, message, tone }]);
    setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4000);
  }, [dismiss]);
  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-20 z-[60] flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map(({ id, message, tone }) => {
            const Icon = ICONS[tone];
            return (
              <motion.div
                key={id}
                layout
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.2 }}
                className="glass pointer-events-auto flex items-start gap-2.5 bg-ink-900 p-3 text-sm text-slate-200"
              >
                <Icon className={`mt-0.5 size-4 shrink-0 ${TONES[tone]}`} aria-hidden />
                <span className="flex-1">{message}</span>
                <button type="button" onClick={() => dismiss(id)} className="text-slate-500 hover:text-white" aria-label="Dismiss notification">
                  <X className="size-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside <ToastProvider>');
  return value;
}
