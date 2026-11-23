import { useEffect, useState } from 'react';
import { Check, LoaderCircle } from 'lucide-react';
import { formatDuration } from '../../utils/format.js';
import { Button } from '../common/Button.jsx';

const STEPS = [
  { key: 'uploading', label: 'Upload' },
  { key: 'queued', label: 'Queued' },
  { key: 'processing', label: 'Enhancing' },
  { key: 'completed', label: 'Done' },
];
const ORDER = { uploading: 0, loading: 1, queued: 1, processing: 2, completed: 3 };

function useElapsed(since) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  return since ? now - new Date(since).getTime() : null;
}

function Step({ label, state }) {
  return (
    <li className="flex flex-1 flex-col items-center gap-2">
      <span
        className={`grid size-8 place-items-center rounded-full text-xs font-semibold ring-1 transition-all duration-300
          ${state === 'done' ? 'bg-brand-400 text-ink-950 ring-brand-400' : ''}
          ${state === 'active' ? 'bg-brand-400/15 text-brand-300 ring-brand-400 shadow-lg shadow-brand-500/30' : ''}
          ${state === 'todo' ? 'bg-white/5 text-slate-500 ring-white/10' : ''}`}
      >
        {state === 'done' && <Check className="size-4" />}
        {state === 'active' && <LoaderCircle className="size-4 animate-spin" />}
      </span>
      <span className={`text-xs ${state === 'todo' ? 'text-slate-500' : 'text-slate-200'}`}>{label}</span>
    </li>
  );
}

export function JobProgress({ phase, uploadProgress, job, onCancel }) {
  const current = ORDER[phase] ?? 0;
  const elapsed = useElapsed(job?.startedAt ?? job?.createdAt);
  const uploading = phase === 'uploading';
  const percent = uploading ? Math.round((uploadProgress ?? 0) * 100) : null;

  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-8 px-4 py-10">
      <ol className="flex w-full max-w-md items-start" aria-label="Progress">
        {STEPS.map((step, i) => (
          <Step key={step.key} label={step.label} state={i < current ? 'done' : i === current ? 'active' : 'todo'} />
        ))}
      </ol>

      <div className="w-full max-w-md">
        <div className="h-2 overflow-hidden rounded-full bg-white/5" role="progressbar" aria-valuenow={percent ?? undefined}>
          {uploading ? (
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-accent-500 transition-[width] duration-200"
              style={{ width: `${percent}%` }}
            />
          ) : (
            <div className="h-full w-full animate-shimmer rounded-full bg-[length:200%_100%] bg-gradient-to-r from-brand-500/20 via-brand-300 to-brand-500/20" />
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span>
            {uploading && `Uploading… ${percent}%`}
            {(phase === 'queued' || phase === 'loading') && 'Waiting for an available inference slot…'}
            {phase === 'processing' && `Running ${job?.model ?? 'model'} at ×${job?.scale ?? ''}…`}
          </span>
          {!uploading && elapsed !== null && <span className="font-mono">{formatDuration(elapsed)}</span>}
        </div>
      </div>

      {uploading && (
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel upload
        </Button>
      )}
    </div>
  );
}
