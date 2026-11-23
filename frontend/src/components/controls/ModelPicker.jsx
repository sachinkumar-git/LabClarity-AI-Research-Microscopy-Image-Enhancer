import { useEffect } from 'react';
import { BrainCircuit, CircleCheck, Lock, Ruler } from 'lucide-react';
import { Badge } from '../common/Badge.jsx';

function ModelOption({ model, selected, onSelect, disabled }) {
  const isBaseline = model.kind === 'baseline';
  const Icon = isBaseline ? Ruler : BrainCircuit;
  const locked = !model.available;

  return (
    <label
      className={`relative flex gap-3 rounded-xl border p-3.5 transition-all duration-200
        ${selected ? 'border-brand-400/60 bg-brand-400/[0.07] shadow-lg shadow-brand-500/10' : 'border-line bg-ink-950/40'}
        ${locked || disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer hover:border-slate-600 hover:bg-white/[0.03]'}`}
    >
      <input
        type="radio"
        name="model"
        value={model.id}
        checked={selected}
        disabled={locked || disabled}
        onChange={() => onSelect(model.id)}
        className="sr-only"
      />
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-lg ring-1
          ${isBaseline ? 'bg-slate-500/10 text-slate-300 ring-slate-500/30' : 'bg-accent-500/10 text-accent-400 ring-accent-400/30'}`}
      >
        <Icon className="size-4.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-white">{model.name}</span>
          {isBaseline ? <Badge>Baseline</Badge> : <Badge tone="accent">AI</Badge>}
          {locked && (
            <Badge tone="warning">
              <Lock className="size-2.5" aria-hidden /> Setup required
            </Badge>
          )}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-slate-400">
          {locked ? model.unavailableReason : model.description}
        </span>
      </span>
      {selected && <CircleCheck className="size-5 shrink-0 text-brand-400" aria-hidden />}
    </label>
  );
}

export function ModelPicker({ models, value, onChange, loading, disabled }) {
  // Auto-select the best available model: first available AI model, else the baseline.
  useEffect(() => {
    const current = models.find((m) => m.id === value);
    if (current?.available) return;
    const best = models.find((m) => m.available && m.kind === 'ai') ?? models.find((m) => m.available);
    if (best && best.id !== value) onChange(best.id);
  }, [models, value, onChange]);

  if (loading) {
    return (
      <div className="space-y-2.5" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[74px] animate-pulse rounded-xl border border-line bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  return (
    <fieldset className="space-y-2.5" disabled={disabled}>
      <legend className="sr-only">Enhancement model</legend>
      {models.map((model) => (
        <ModelOption key={model.id} model={model} selected={model.id === value} onSelect={onChange} disabled={disabled} />
      ))}
    </fieldset>
  );
}
