import { FlaskConical, Play } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { Alert } from '../components/common/Alert.jsx';
import { Button } from '../components/common/Button.jsx';
import { Panel } from '../components/common/Panel.jsx';
import { AssetCard } from '../components/lab/AssetCard.jsx';
import { ExperimentPicker } from '../components/lab/ExperimentPicker.jsx';
import { PipelineBuilder } from '../components/lab/PipelineBuilder.jsx';
import { RunOptions } from '../components/lab/RunOptions.jsx';
import { Reveal } from '../components/motion/Reveal.jsx';
import { Dropzone } from '../components/upload/Dropzone.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { MAX_FILES, useLabSession } from '../hooks/useLabSession.js';
import { pipelineForModel, recommendedPreset } from '../utils/pipeline.js';

export function EnhancePage() {
  const { models, operations } = useCatalog();
  const lab = useLabSession();
  const [params] = useSearchParams();
  const appliedModel = useRef(false);

  // Deep link from the Model Library: /enhance?model=<id> starts with that model's pipeline.
  useEffect(() => {
    const wanted = params.get('model');
    if (!wanted || appliedModel.current || !models.length) return;
    appliedModel.current = true;
    const preset = pipelineForModel(models.find((m) => m.id === wanted));
    if (preset) lab.setPipelines([preset]);
    else lab.setError(`Model "${wanted}" is not available on this server yet.`);
  }, [params, models, lab]);
  const uploading = lab.uploadProgress !== null;
  const mode = lab.selected.length > 1 ? 'Batch' : lab.pipelines.length > 1 ? 'Comparison' : 'Single run';

  return (
    <>
      <Reveal as="header" className="mx-auto max-w-[1440px] px-4 pt-8 pb-6 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">Enhance</h1>
        <p className="mt-1 text-sm text-slate-400">Upload micrographs, review the measured degradation, then run one or more restoration pipelines.</p>
      </Reveal>
      <main className="mx-auto grid max-w-[1440px] gap-6 px-4 pb-28 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel step="1" title="Project & images" subtitle={`Upload up to ${MAX_FILES} images; each is analysed for noise, blur and contrast`}>
            <ExperimentPicker value={lab.experimentId} onChange={lab.changeExperiment} disabled={uploading} />
            <div className="mt-4">
              <Dropzone multiple onFiles={lab.upload} disabled={uploading} compact={lab.assets.length > 0} />
            </div>
            {uploading && (
              <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full bg-gradient-to-r from-brand-400 to-accent-500 transition-[width]" style={{ width: `${Math.round(lab.uploadProgress * 100)}%` }} />
                </div>
                {lab.uploadProgress < 1 ? `Uploading ${Math.round(lab.uploadProgress * 100)}%` : 'Analysing…'}
                <button type="button" onClick={lab.cancelUpload} className="text-slate-500 hover:text-white">Cancel</button>
              </div>
            )}
            <div className="mt-4 space-y-3">
              {lab.assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  selected={lab.selected.includes(asset.id)}
                  onToggle={() => lab.toggleSelected(asset.id)}
                  onUseRecommendation={() => lab.setPipelines((p) => [...p, recommendedPreset(asset)].slice(0, 6))}
                />
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel step="2" title="Restoration pipelines" subtitle="Several pipelines on one image = side-by-side model comparison">
            <PipelineBuilder
              pipelines={lab.pipelines}
              onChange={lab.setPipelines}
              operations={operations}
              models={models}
              recommendationSource={lab.selectedAssets[0]}
            />
          </Panel>
          <Panel step="3" title="Options" subtitle="Region of interest and ground-truth reference">
            <RunOptions
              selectedAssets={lab.selectedAssets}
              assets={lab.assets}
              roi={lab.roi}
              onRoiChange={lab.setRoi}
              referenceId={lab.referenceId}
              onReferenceChange={lab.setReferenceId}
            />
          </Panel>
          {lab.error && <Alert tone="error" onDismiss={() => lab.setError(null)}>{lab.error}</Alert>}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink-900/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <FlaskConical className="size-5 text-brand-400" aria-hidden />
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-white">{mode}</span> · {lab.selected.length} image{lab.selected.length === 1 ? '' : 's'} × {lab.pipelines.length} pipeline{lab.pipelines.length === 1 ? '' : 's'} = <span className="font-mono text-brand-300">{lab.runCount}</span> runs
            {lab.blocked && <span className="ml-2 text-xs text-slate-500">{lab.blocked}</span>}
          </p>
          <Button className="ml-auto" icon={Play} onClick={lab.start} disabled={Boolean(lab.blocked)} loading={lab.submitting}>
            Start processing
          </Button>
        </div>
      </div>
    </>
  );
}
