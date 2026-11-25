import { BrainCircuit, CircleCheck, Copy, ExternalLink, Lock, Ruler, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useToast } from '../../context/ToastContext.jsx';
import { Accordion } from '../common/Accordion.jsx';
import { Badge } from '../common/Badge.jsx';
import { Button } from '../common/Button.jsx';
import { StaggerItem } from '../motion/Reveal.jsx';

const TASK_LABEL = { super_resolution: 'Super-resolution', denoise: 'Denoising' };

function SetupSteps({ model }) {
  const { notify } = useToast();
  const command = `Invoke-WebRequest ${model.source} -OutFile backend\\ai-service\\weights\\${model.weightsFile}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      notify('Download command copied');
    } catch {
      notify('Clipboard unavailable: select the command and copy it manually', 'error');
    }
  };
  return (
    <ol className="space-y-2 text-xs text-slate-400">
      <li>1. Install PyTorch and spandrel on the AI service (see README).</li>
      <li>2. Download <span className="font-mono text-slate-200">{model.weightsFile}</span> into <span className="font-mono">backend/ai-service/weights/</span>:</li>
      <li className="flex items-start gap-2 rounded-lg bg-ink-950/70 p-2 font-mono text-[11px] break-all text-slate-300">
        <span className="flex-1">{command}</span>
        <button type="button" onClick={copy} className="shrink-0 rounded p-1 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Copy download command"><Copy className="size-3.5" /></button>
      </li>
      <li>3. Restart the AI service; availability updates automatically.</li>
    </ol>
  );
}

export function ModelCard({ model }) {
  const navigate = useNavigate();
  const isAi = model.kind === 'ai';
  const Icon = isAi ? BrainCircuit : Ruler;
  return (
    <StaggerItem className="glass card-interactive flex flex-col p-5">
      <div className="flex items-start gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${isAi ? 'bg-violet-500/12 text-violet-500' : 'bg-slate-500/10 text-slate-400'}`}><Icon className="size-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white">{model.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone="brand">{TASK_LABEL[model.task] ?? model.task}</Badge>
            <Badge>{isAi ? 'Pretrained AI' : 'Classical baseline'}</Badge>
            {model.version && model.version !== 'builtin' && <Badge>{model.version}</Badge>}
          </div>
        </div>
        {model.available
          ? <span className="flex items-center gap-1 text-xs font-medium text-emerald-400"><CircleCheck className="size-4" aria-hidden /> Ready</span>
          : <span className="flex items-center gap-1 text-xs font-medium text-amber-400"><Lock className="size-3.5" aria-hidden /> Setup required</span>}
      </div>
      <p className="mt-3 flex-1 text-sm text-slate-400">{model.description}</p>
      {!model.available && <p className="mt-2 text-xs text-amber-300">{model.unavailableReason}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" icon={Wand2} disabled={!model.available} onClick={() => navigate(`/enhance?model=${model.id}`)}>
          Use in Enhance
        </Button>
        {model.source && (
          <Button as="a" size="sm" variant="ghost" href={model.source} target="_blank" rel="noreferrer" iconRight={ExternalLink}>Weights source</Button>
        )}
      </div>
      {!model.available && model.weightsFile && (
        <Accordion title="Setup instructions" className="mt-3 border-t border-line pt-2"><SetupSteps model={model} /></Accordion>
      )}
    </StaggerItem>
  );
}
