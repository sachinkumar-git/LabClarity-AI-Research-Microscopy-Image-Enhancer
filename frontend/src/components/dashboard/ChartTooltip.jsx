/** Hover readout: value leads, label follows; series keyed with a short line, not a box.
 * `x`/`y` are CSS lengths relative to the positioned parent (the mark's top centre). */
export function ChartTooltip({ x, y, title, rows }) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-ink-950/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
      style={{ left: x, top: `calc(${y} - 8px)` }}
    >
      <p className="mb-1 text-[11px] text-slate-400">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center gap-2">
          {row.color && <span className="h-0.5 w-3 rounded-full" style={{ background: row.color }} aria-hidden />}
          <span className="font-mono font-semibold text-white">{row.value}</span>
          <span className="text-slate-400">{row.label}</span>
        </p>
      ))}
    </div>
  );
}
