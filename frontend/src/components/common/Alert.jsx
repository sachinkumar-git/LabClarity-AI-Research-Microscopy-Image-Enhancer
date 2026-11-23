import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';

const TONES = {
  error: { icon: TriangleAlert, cls: 'border-rose-500/30 bg-rose-500/10 text-rose-100' },
  warning: { icon: TriangleAlert, cls: 'border-amber-500/30 bg-amber-500/10 text-amber-100' },
  info: { icon: Info, cls: 'border-brand-400/30 bg-brand-400/10 text-cyan-50' },
  success: { icon: CircleCheck, cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' },
};

export function Alert({ tone = 'info', title, children, onDismiss, className = '' }) {
  const { icon: Icon, cls } = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex animate-fade-in gap-3 rounded-xl border p-3.5 text-sm ${cls} ${className}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-[13px] leading-relaxed opacity-90">{children}</div>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Dismiss">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
