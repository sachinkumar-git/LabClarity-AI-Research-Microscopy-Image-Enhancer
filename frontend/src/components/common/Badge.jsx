const TONES = {
  neutral: 'bg-white/5 text-slate-300 ring-white/10',
  brand: 'bg-brand-400/10 text-brand-300 ring-brand-400/30',
  accent: 'bg-accent-400/10 text-accent-400 ring-accent-400/30',
  success: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/30',
  warning: 'bg-amber-400/10 text-amber-300 ring-amber-400/30',
  danger: 'bg-rose-400/10 text-rose-300 ring-rose-400/30',
};

export function Badge({ tone = 'neutral', dot = false, className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
