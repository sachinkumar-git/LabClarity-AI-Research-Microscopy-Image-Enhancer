/** Accessible radio-group styled as a segmented control. */
export function SegmentedControl({ label, options, value, onChange, size = 'md', disabled = false }) {
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm';
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-line bg-ink-950/60 p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            title={opt.title}
            className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-all ${pad}
              ${active ? 'bg-white/10 text-white shadow-inner ring-1 ring-white/10' : 'text-slate-400 hover:text-slate-200'}
              disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {Icon && <Icon className="size-3.5" aria-hidden />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
