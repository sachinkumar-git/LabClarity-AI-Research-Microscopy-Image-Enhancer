import { Layers, Lightbulb, Plus } from 'lucide-react';
import { availableModels, newPipeline, recommendedPreset, srComparisonPreset } from '../../utils/pipeline.js';
import { Button } from '../common/Button.jsx';
import { PipelineCard } from './PipelineCard.jsx';

const MAX_PIPELINES = 6;

/** Builds 1-6 pipelines. Several pipelines on one image = a multi-model comparison. */
export function PipelineBuilder({ pipelines, onChange, operations, models, recommendationSource }) {
  const add = (items) => onChange([...pipelines, ...items].slice(0, MAX_PIPELINES));
  const srModels = availableModels(models, 'super_resolution');
  const recommended = recommendedPreset(recommendationSource);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={Plus} onClick={() => add([newPipeline()])} disabled={pipelines.length >= MAX_PIPELINES}>
          Pipeline
        </Button>
        <Button variant="secondary" size="sm" icon={Lightbulb} onClick={() => add([recommended])} disabled={!recommended || pipelines.length >= MAX_PIPELINES}>
          Recommended
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={Layers}
          onClick={() => onChange(srComparisonPreset(models, 4).slice(0, MAX_PIPELINES))}
          disabled={srModels.length < 2}
          title={srModels.length < 2 ? 'Install at least one AI super-resolution model to compare' : 'One pipeline per available SR model'}
        >
          Compare all SR models ({srModels.length})
        </Button>
      </div>
      {pipelines.length === 0 && (
        <p className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-slate-500">
          Upload an image to get a recommended pipeline, or add one manually.
        </p>
      )}
      {pipelines.map((pipeline, i) => (
        <PipelineCard
          key={pipeline.key}
          pipeline={pipeline}
          index={i}
          operations={operations}
          models={models}
          onChange={(next) => onChange(pipelines.map((p) => (p.key === pipeline.key ? next : p)))}
          onRemove={() => onChange(pipelines.filter((p) => p.key !== pipeline.key))}
        />
      ))}
    </div>
  );
}
