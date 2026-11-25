import { FileImage, Plus, ShieldCheck } from 'lucide-react';
import { assetUrl } from '../../api/imageApi.js';
import { formatBytes } from '../../utils/format.js';
import { Badge } from '../common/Badge.jsx';
import { Button } from '../common/Button.jsx';
import { AnalysisSummary } from './AnalysisSummary.jsx';

/** One uploaded source image: selection, fingerprint, analysis and recommendation. */
export function AssetCard({ asset, selected, onToggle, onUseRecommendation }) {
  const a = asset.analysis;
  return (
    <article className={`animate-fade-in rounded-xl border p-3 transition ${selected ? 'border-brand-400/50 bg-brand-400/[0.04]' : 'border-line bg-ink-950/40'}`}>
      <div className="flex gap-3">
        <label className="checkerboard relative grid size-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg ring-1 ring-white/10">
          {asset.links.preview ? (
            <img src={assetUrl(asset.links.preview)} alt="" className="size-full object-cover" />
          ) : (
            <FileImage className="size-7 text-slate-500" aria-hidden />
          )}
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="absolute top-1.5 left-1.5 size-4 accent-cyan-400"
            aria-label={`Select ${asset.originalName}`}
          />
        </label>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white" title={asset.originalName}>{asset.originalName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
            {a && <Badge tone="brand">{a.width}×{a.height}</Badge>}
            {a && <Badge>{a.bitDepth}-bit · {a.channels} ch</Badge>}
            <span>{formatBytes(asset.sizeBytes)}</span>
          </div>
          <p className="mt-1.5 flex items-center gap-1 truncate font-mono text-[10px] text-slate-500" title={`SHA-256 ${asset.sha256}`}>
            <ShieldCheck className="size-3 text-emerald-400" aria-hidden /> sha256 {asset.sha256.slice(0, 16)}…
          </p>
        </div>
      </div>
      <div className="mt-3">
        <AnalysisSummary analysis={a} recommendation={asset.recommendation} />
      </div>
      {asset.recommendation && (
        <Button variant="ghost" size="sm" icon={Plus} className="mt-2" onClick={onUseRecommendation}>
          Add recommended pipeline
        </Button>
      )}
    </article>
  );
}
