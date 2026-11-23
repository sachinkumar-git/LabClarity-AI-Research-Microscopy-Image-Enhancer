/** Glass surface with an optional numbered step header. */
export function Panel({ step, title, subtitle, action, className = '', children }) {
  return (
    <section className={`glass p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {step && (
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-400/10 font-mono text-xs font-semibold text-brand-300 ring-1 ring-brand-400/30">
                {step}
              </span>
            )}
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-white">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
