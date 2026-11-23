import { Wand2 } from 'lucide-react';
import { SCALES } from '../config.js';
import { Alert } from '../components/common/Alert.jsx';
import { Button } from '../components/common/Button.jsx';
import { Panel } from '../components/common/Panel.jsx';
import { SegmentedControl } from '../components/common/SegmentedControl.jsx';
import { ModelPicker } from '../components/controls/ModelPicker.jsx';
import { ResultPanel } from '../components/results/ResultPanel.jsx';
import { Dropzone } from '../components/upload/Dropzone.jsx';
import { FileCard } from '../components/upload/FileCard.jsx';
import { useEnhanceWorkflow } from '../hooks/useEnhanceWorkflow.js';

const SCALE_OPTIONS = SCALES.map((s) => ({ value: s, label: `×${s}` }));
const BUSY = new Set(['uploading', 'loading', 'queued', 'processing']);

export function Workspace({ models }) {
  const workflow = useEnhanceWorkflow();
  const { file, model, scale, phase, error } = workflow;
  const busy = BUSY.has(phase);

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
      <div className="space-y-6">
        <Panel step="1" title="Upload image" subtitle="Drag, browse or paste from clipboard">
          {file ? (
            <FileCard file={file} onRemove={workflow.reset} disabled={busy} />
          ) : (
            <Dropzone onFile={workflow.selectFile} disabled={busy} />
          )}
          {file && !busy && (
            <div className="mt-3">
              <Dropzone onFile={workflow.selectFile} compact />
            </div>
          )}
        </Panel>

        <Panel
          step="2"
          title="Choose model"
          subtitle="Locked models need weights on the AI service"
        >
          {models.error ? (
            <Alert tone="error" title="Models unavailable">
              {models.error.message}
            </Alert>
          ) : (
            <ModelPicker
              models={models.models}
              value={model}
              onChange={workflow.setModel}
              loading={models.loading}
              disabled={busy}
            />
          )}
        </Panel>

        <Panel
          step="3"
          title="Upscale factor"
          action={<SegmentedControl label="Upscale factor" options={SCALE_OPTIONS} value={scale} onChange={workflow.setScale} disabled={busy} />}
        >
          <p className="text-xs text-slate-400">
            ×4 reveals the most detail; ×2 keeps files smaller and adds fewer synthetic textures.
          </p>
        </Panel>

        {error && phase !== 'failed' && <Alert tone="error">{error}</Alert>}

        <Button size="lg" icon={Wand2} className="w-full" onClick={workflow.start} disabled={!workflow.canStart} loading={busy}>
          {busy ? 'Enhancing…' : 'Enhance image'}
        </Button>
      </div>

      <ResultPanel workflow={workflow} />
    </main>
  );
}
