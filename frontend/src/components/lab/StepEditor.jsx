import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { OP_LABELS, RELEVANT_PARAMS } from '../../utils/pipeline.js';

const selectCls = 'h-8 rounded-lg border border-line bg-ink-950/70 px-2 text-xs text-slate-100 focus:border-brand-400/60 focus:outline-none';

function ParamSlider({ name, spec, value, onChange }) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-slate-400">
      <span className="w-20 shrink-0 font-mono">{name}</span>
      <input
        type="range" min={spec.min} max={spec.max} step={spec.step} value={value ?? spec.default}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 flex-1 accent-cyan-400"
      />
      <span className="w-12 text-right font-mono text-slate-200">{value ?? spec.default}</span>
    </label>
  );
}

function ModelSelect({ models, task, value, onChange }) {
  return (
    <select aria-label="Model" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={selectCls}>
      {models.filter((m) => m.task === task).map((m) => (
        <option key={m.id} value={m.id} disabled={!m.available}>
          {m.name}{m.available ? '' : ' (setup required)'}
        </option>
      ))}
    </select>
  );
}

/** Edits one pipeline step using the operation catalogue served by the AI service. */
export function StepEditor({ step, index, count, operations, models, onChange, onMove, onRemove }) {
  const spec = operations.find((o) => o.op === step.op) ?? { params: {} };
  const set = (patch) => onChange({ ...step, ...patch });
  const params = (RELEVANT_PARAMS[step.op]?.[step.method] ?? []).filter((p) => p !== 'model');
  const denoiseModels = models.filter((m) => m.task === 'denoise');
  const changeMethod = (method) =>
    set({ method, ...(method === 'ai' && !step.model ? { model: denoiseModels.find((m) => m.available)?.id } : {}) });

  return (
    <li className="rounded-lg border border-line bg-ink-950/50 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-5 place-items-center rounded bg-white/5 font-mono text-[10px] text-slate-400">{index + 1}</span>
        <span className="text-xs font-semibold text-white">{OP_LABELS[step.op] ?? step.op}</span>
        {spec.methods && (
          <select aria-label="Method" value={step.method} onChange={(e) => changeMethod(e.target.value)} className={selectCls}>
            {Object.entries(spec.methods).map(([key, label]) => (
              <option key={key} value={key} disabled={key === 'ai' && !denoiseModels.some((m) => m.available)}>{label}</option>
            ))}
          </select>
        )}
        {step.op === 'super_resolution' && (
          <>
            <ModelSelect models={models} task="super_resolution" value={step.model} onChange={(model) => set({ model })} />
            <select aria-label="Scale" value={step.scale} onChange={(e) => set({ scale: Number(e.target.value) })} className={selectCls}>
              {[2, 4].map((s) => <option key={s} value={s}>×{s}</option>)}
            </select>
          </>
        )}
        {step.op === 'denoise' && step.method === 'ai' && (
          <ModelSelect models={models} task="denoise" value={step.model} onChange={(model) => set({ model })} />
        )}
        <div className="ml-auto flex gap-0.5">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="rounded p-1 text-slate-400 hover:text-white disabled:opacity-30" aria-label="Move step up"><ArrowUp className="size-3.5" /></button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} className="rounded p-1 text-slate-400 hover:text-white disabled:opacity-30" aria-label="Move step down"><ArrowDown className="size-3.5" /></button>
          <button type="button" onClick={onRemove} className="rounded p-1 text-slate-400 hover:text-rose-300" aria-label="Remove step"><Trash2 className="size-3.5" /></button>
        </div>
      </div>
      {params.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {params.map((name) => spec.params[name] && (
            <ParamSlider key={name} name={name} spec={spec.params[name]} value={step[name]} onChange={(v) => set({ [name]: v })} />
          ))}
        </div>
      )}
      {spec.warning && <p className="mt-1.5 text-[11px] text-amber-200/80">{spec.warning}</p>}
    </li>
  );
}
