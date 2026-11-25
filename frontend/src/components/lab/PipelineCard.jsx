import { Plus, X } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { OP_LABELS, defaultStep, describePipeline } from '../../utils/pipeline.js';
import { StepEditor } from './StepEditor.jsx';

/** One editable pipeline (ordered steps + optional label). */
export function PipelineCard({ pipeline, index, operations, models, onChange, onRemove }) {
  const { steps } = pipeline;
  const { prefs } = useSettings();
  const setSteps = (next) => onChange({ ...pipeline, steps: next });
  const addStep = (op) => {
    const step = defaultStep(op, { operations, models, preferredSrModel: prefs.defaultSrModel });
    // Keep super-resolution last unless the user reorders: restoration works best before upscaling.
    const srIndex = steps.findIndex((s) => s.op === 'super_resolution');
    setSteps(op !== 'super_resolution' && srIndex >= 0 && op !== 'contrast'
      ? [...steps.slice(0, srIndex), step, ...steps.slice(srIndex)]
      : [...steps, step]);
  };
  const move = (i, delta) => {
    const next = [...steps];
    [next[i], next[i + delta]] = [next[i + delta], next[i]];
    setSteps(next);
  };
  const hasSr = steps.some((s) => s.op === 'super_resolution');

  return (
    <section className="rounded-xl border border-line bg-white/[0.02] p-3">
      <header className="flex items-center gap-2">
        <span className="rounded-md bg-accent-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent-400">P{index + 1}</span>
        <input
          value={pipeline.label}
          maxLength={80}
          onChange={(e) => onChange({ ...pipeline, label: e.target.value })}
          placeholder={steps.length ? describePipeline(steps) : 'Untitled pipeline'}
          className="h-8 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm text-white placeholder:text-slate-500 hover:border-line focus:border-brand-400/50 focus:outline-none"
          aria-label={`Pipeline ${index + 1} label`}
        />
        <button type="button" onClick={onRemove} className="rounded p-1 text-slate-400 hover:text-rose-300" aria-label="Remove pipeline"><X className="size-4" /></button>
      </header>

      <ol className="mt-2 space-y-2">
        {steps.map((step, i) => (
          <StepEditor
            key={`${step.op}-${i}`}
            step={step}
            index={i}
            count={steps.length}
            operations={operations}
            models={models}
            onChange={(next) => setSteps(steps.map((s, j) => (j === i ? next : s)))}
            onMove={(delta) => move(i, delta)}
            onRemove={() => setSteps(steps.filter((_, j) => j !== i))}
          />
        ))}
      </ol>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {Object.keys(OP_LABELS).filter((op) => !(op === 'super_resolution' && hasSr)).map((op) => (
          <button
            key={op}
            type="button"
            disabled={steps.length >= 6}
            onClick={() => addStep(op)}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-700 px-2 py-1 text-[11px] text-slate-400 transition hover:border-brand-400/50 hover:text-brand-300 disabled:opacity-40"
          >
            <Plus className="size-3" aria-hidden /> {OP_LABELS[op]}
          </button>
        ))}
      </div>
    </section>
  );
}
