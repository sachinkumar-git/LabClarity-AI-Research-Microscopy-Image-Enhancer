import { ScanSearch } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="grid-bg relative flex h-full min-h-[420px] flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-line px-6 text-center">
      <div className="pointer-events-none absolute size-72 rounded-full bg-brand-500/10 blur-3xl" aria-hidden />
      <span className="relative grid size-16 place-items-center rounded-2xl bg-ink-800 ring-1 ring-white/10">
        <ScanSearch className="size-8 text-brand-300" aria-hidden />
      </span>
      <h3 className="relative mt-5 text-base font-semibold text-white">Your comparison appears here</h3>
      <p className="relative mt-2 max-w-sm text-sm text-slate-400">
        Upload an image, pick a model and scale, then hit <span className="text-brand-300">Enhance</span>.
        You can inspect the result with a before/after slider and up to 8× zoom.
      </p>
    </div>
  );
}
