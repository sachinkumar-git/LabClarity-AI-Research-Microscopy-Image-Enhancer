import { Database, Download, FileDown, RotateCcw } from 'lucide-react';
import { assetUrl } from '../../api/imageApi.js';
import { Alert } from '../common/Alert.jsx';
import { Button } from '../common/Button.jsx';
import { Panel } from '../common/Panel.jsx';
import { CompareViewer } from '../compare/CompareViewer.jsx';
import { JobProgress } from '../progress/JobProgress.jsx';
import { EmptyState } from './EmptyState.jsx';
import { MetricsGrid } from './MetricsGrid.jsx';

function CompletedView({ job, onReset }) {
  const m = job.metrics ?? {};
  return (
    <div className="space-y-5">
      <CompareViewer
        originalSrc={assetUrl(job.links.preview)}
        enhancedSrc={assetUrl(job.links.enhanced)}
        width={m.outputWidth}
        height={m.outputHeight}
        labels={{ original: `Original · ${m.inputWidth ?? '?'}×${m.inputHeight ?? '?'}`, enhanced: `Enhanced · ×${job.scale}` }}
      />
      <MetricsGrid job={job} />
      <div className="flex flex-wrap gap-3">
        <Button as="a" href={assetUrl(job.links.enhanced, { download: true })} icon={Download}>
          Download enhanced PNG
        </Button>
        {job.links.enhancedData && (
          <Button
            as="a"
            variant="secondary"
            href={assetUrl(job.links.enhancedData)}
            icon={Database}
            title="16-bit grayscale at the original intensity scale, for quantitative analysis"
          >
            16-bit data
          </Button>
        )}
        <Button as="a" variant="secondary" href={assetUrl(job.links.original)} icon={FileDown}>
          Original file
        </Button>
        <Button variant="ghost" icon={RotateCcw} onClick={onReset} className="sm:ml-auto">
          New image
        </Button>
      </div>
    </div>
  );
}

const TITLES = {
  idle: ['Comparison', 'Original vs. enhanced'],
  completed: ['Result', null],
  failed: ['Enhancement failed', null],
};

export function ResultPanel({ workflow }) {
  const { phase, job, error, uploadProgress, cancelUpload, start, reset, file } = workflow;
  const [title, subtitle] = TITLES[phase] ?? ['Processing', 'This can take a while on CPU'];

  return (
    <Panel title={title} subtitle={subtitle ?? (job ? job.originalName : undefined)} className="min-h-[520px]">
      {phase === 'idle' && <EmptyState />}
      {phase === 'completed' && job && <CompletedView job={job} onReset={reset} />}
      {phase === 'failed' && (
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-5">
          <Alert tone="error" title="We couldn't enhance this image" className="w-full max-w-md">
            {job?.error || error || 'Unknown error'}
          </Alert>
          <div className="flex gap-3">
            {file && <Button icon={RotateCcw} onClick={start}>Try again</Button>}
            <Button variant="secondary" onClick={reset}>Start over</Button>
          </div>
        </div>
      )}
      {['uploading', 'loading', 'queued', 'processing'].includes(phase) && (
        <JobProgress phase={phase} uploadProgress={uploadProgress} job={job} onCancel={cancelUpload} />
      )}
    </Panel>
  );
}
