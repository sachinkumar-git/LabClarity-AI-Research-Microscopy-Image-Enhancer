import { Database, Download, FileText, Flame, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { assetUrl } from '../api/imageApi.js';
import { deleteRun, getRun, retryRun } from '../api/researchApi.js';
import { Alert } from '../components/common/Alert.jsx';
import { Button } from '../components/common/Button.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { PageSkeleton } from '../components/common/Skeleton.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Panel } from '../components/common/Panel.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { CompareViewer } from '../components/compare/CompareViewer.jsx';
import { JobProgress } from '../components/progress/JobProgress.jsx';
import { MetricsGrid } from '../components/results/MetricsGrid.jsx';
import { AuditTrail } from '../components/run/AuditTrail.jsx';
import { QualityPanel } from '../components/run/QualityPanel.jsx';
import { usePolling } from '../hooks/useApi.js';

const TERMINAL = new Set(['completed', 'failed']);

function cropFor(run) {
  const input = run.audit?.input;
  if (!run.roi || !input) return null;
  return { ...run.roi, fullWidth: input.width, fullHeight: input.height };
}

export function RunPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [attempt, setAttempt] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const { data: run, error } = usePolling((signal) => getRun(id, signal), `${id}-${attempt}`, { isDone: (r) => TERMINAL.has(r.status) });

  const retry = async () => {
    try {
      await retryRun(id);
      notify('Run re-queued');
      setAttempt((a) => a + 1);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  if (error) return <main className="mx-auto max-w-3xl px-4 py-16"><Alert tone="error" title="Run not available">{error.message}</Alert></main>;
  if (!run) return <PageSkeleton />;

  const m = run.metrics ?? {};
  const links = run.links;
  return (
    <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">
            {run.experimentId ? <Link className="hover:text-brand-300" to={`/projects/${run.experimentId}`}>Project</Link> : 'Ad-hoc run'}
            {run.batchId && <> · <Link className="hover:text-brand-300" to={`/batches/${run.batchId}`}>Batch</Link></>}
            {' · '}<Link className="hover:text-brand-300" to="/history">History</Link>
          </p>
          <h1 className="mt-1 truncate text-2xl font-semibold text-white">{run.label ?? run.model}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-400"><StatusBadge status={run.status} /> {run.originalName}{run.roi && ` · ROI ${run.roi.width}×${run.roi.height}`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {run.status === 'failed' && <Button icon={RotateCcw} onClick={retry}>Retry run</Button>}
          {run.status !== 'processing' && <Button variant="ghost" icon={Trash2} onClick={() => setConfirming(true)}>Delete</Button>}
        {run.status === 'completed' && (
          <>
            <Button as="a" href={assetUrl(links.enhanced, { download: true })} icon={Download}>Output PNG</Button>
            {links.enhancedData && <Button as="a" variant="secondary" href={assetUrl(links.enhancedData)} icon={Database}>16-bit data</Button>}
            {links.diff && <Button as="a" variant="secondary" href={`${assetUrl(links.diff)}?download=1`} icon={Flame}>Difference map</Button>}
            <Button as="a" variant="secondary" href={assetUrl(links.report)} icon={FileText}>PDF report</Button>
          </>
        )}
        </div>
      </header>

      {run.status === 'failed' && <Alert tone="error" title="This run failed">{run.error}</Alert>}
      {!TERMINAL.has(run.status) && <Panel><JobProgress phase={run.status} job={run} /></Panel>}

      {run.status === 'completed' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <Panel>
              <CompareViewer
                originalSrc={assetUrl(links.preview)}
                enhancedSrc={assetUrl(links.enhanced)}
                diffSrc={assetUrl(links.diff)}
                diffStats={run.audit?.difference}
                width={m.outputWidth}
                height={m.outputHeight}
                crop={cropFor(run)}
                labels={{ original: `Original${run.roi ? ' (ROI)' : ''} · ${m.inputWidth}×${m.inputHeight}`, enhanced: `Processed · ×${run.scale}` }}
              />
            </Panel>
            <MetricsGrid job={run} />
          </div>
          <div className="space-y-6">
            <Panel title="Quality assessment"><QualityPanel quality={run.quality} /></Panel>
            <Panel title="Audit trail" subtitle="Everything needed to reproduce this result"><AuditTrail run={run} /></Panel>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirming} onClose={() => setConfirming(false)}
        title="Delete this run?" description="Its output files are removed. The original image is kept."
        onConfirm={async () => { await deleteRun(id); notify('Run deleted'); navigate('/history'); }}
      />
    </main>
  );
}
