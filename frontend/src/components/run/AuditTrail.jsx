import { useState } from 'react';
import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { verifyAsset } from '../../api/researchApi.js';
import { Button } from '../common/Button.jsx';

const short = (hash) => (hash ? `${hash.slice(0, 12)}…${hash.slice(-6)}` : '—');

function Integrity({ assetId, sha }) {
  const [state, setState] = useState(null);
  const check = async () => {
    setState('checking');
    try {
      setState((await verifyAsset(assetId)).intact ? 'intact' : 'mismatch');
    } catch {
      setState('error');
    }
  };
  const Icon = state === 'intact' ? ShieldCheck : state === 'mismatch' ? ShieldAlert : ShieldQuestion;
  const tone = state === 'intact' ? 'text-emerald-300' : state === 'mismatch' ? 'text-rose-300' : 'text-slate-400';
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-ink-950/40 p-3">
      <div className={`flex items-center gap-2 text-xs ${tone}`}>
        <Icon className="size-4" aria-hidden />
        <span>
          {state === 'intact' && 'Original verified unmodified (SHA-256 match)'}
          {state === 'mismatch' && 'Original does NOT match its recorded fingerprint'}
          {state === 'error' && 'Verification failed'}
          {(state === null || state === 'checking') && <>Input SHA-256 <span className="font-mono">{short(sha)}</span></>}
        </span>
      </div>
      {assetId && <Button variant="secondary" size="sm" onClick={check} loading={state === 'checking'}>Verify original</Button>}
    </div>
  );
}

/** Scientific audit trail: every step, parameter, model fingerprint and software version. */
export function AuditTrail({ run }) {
  const audit = run.audit ?? {};
  const steps = audit.steps ?? [];
  return (
    <div className="space-y-3">
      <Integrity assetId={run.assetId} sha={run.inputSha256} />
      <ol className="space-y-2">
        {steps.map((s) => (
          <li key={s.index} className="rounded-xl border border-line bg-ink-950/40 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-white">{s.index + 1}. {s.op.replace('_', '-')} · <span className="text-brand-300">{s.model?.id ?? s.method}</span></span>
              <span className="font-mono text-slate-500">{s.durationMs} ms</span>
            </div>
            <p className="mt-1 font-mono text-[11px] break-all text-slate-400">{JSON.stringify(s.params)}</p>
            {s.derived && Object.keys(s.derived).length > 0 && (
              <p className="mt-0.5 font-mono text-[11px] text-slate-500">derived {JSON.stringify(s.derived)}</p>
            )}
            {s.model?.weightsSha256 && (
              <p className="mt-1 font-mono text-[11px] text-slate-500" title={s.model.weightsSha256}>
                {s.model.name} {s.model.version} · weights {short(s.model.weightsSha256)}
              </p>
            )}
          </li>
        ))}
      </ol>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <dt className="text-slate-500">Processed at</dt><dd className="font-mono text-slate-300">{audit.timestamp ?? '—'}</dd>
        <dt className="text-slate-500">Device</dt><dd className="font-mono text-slate-300">{audit.device ?? '—'}</dd>
        <dt className="text-slate-500">Intensity-preserving</dt><dd className="font-mono text-slate-300">{String(audit.output?.intensityPreserving ?? '—')}</dd>
        {Object.entries(audit.software ?? {}).map(([k, v]) => (
          <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="font-mono text-slate-300">{v ?? 'n/a'}</dd></div>
        ))}
      </dl>
      {audit.output?.label && <p className="rounded-lg bg-amber-400/5 p-2 text-[11px] text-amber-100/80 ring-1 ring-amber-400/20">{audit.output.label}</p>}
    </div>
  );
}
