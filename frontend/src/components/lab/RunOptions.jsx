import { assetUrl } from '../../api/imageApi.js';
import { RoiSelector } from './RoiSelector.jsx';

const selectCls = 'h-10 w-full rounded-xl border border-line bg-ink-950/60 px-3 text-sm text-slate-100 focus:border-brand-400/60 focus:outline-none';

/** Region of interest (single image only) and optional ground-truth reference. */
export function RunOptions({ selectedAssets, assets, roi, onRoiChange, referenceId, onReferenceChange }) {
  const single = selectedAssets.length === 1 ? selectedAssets[0] : null;
  const canRoi = single?.links.preview && single.analysis;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold tracking-wide text-slate-300 uppercase">Region of interest</h3>
        {canRoi ? (
          <div className="mt-2">
            <RoiSelector
              src={assetUrl(single.links.preview)}
              width={single.analysis.width}
              height={single.analysis.height}
              roi={roi}
              onChange={onRoiChange}
            />
          </div>
        ) : (
          <p className="mt-1.5 text-xs text-slate-500">
            {selectedAssets.length > 1 ? 'Select a single image to process a region of interest.' : 'Upload and select an image first.'}
          </p>
        )}
      </div>

      <div>
        <h3 className="text-xs font-semibold tracking-wide text-slate-300 uppercase">Ground-truth reference (optional)</h3>
        <p className="mt-1 mb-2 text-xs text-slate-500">
          A high-quality image of the same field at the output size enables true PSNR/SSIM. Without it, only
          consistency and no-reference metrics are reported.
        </p>
        <select aria-label="Reference image" value={referenceId} onChange={(e) => onReferenceChange(e.target.value)} className={selectCls}>
          <option value="">None</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.originalName}{a.analysis ? ` (${a.analysis.width}×${a.analysis.height})` : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
