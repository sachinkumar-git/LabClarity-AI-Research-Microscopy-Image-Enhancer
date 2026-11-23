import { FileImage, X } from 'lucide-react';
import { useObjectUrl } from '../../hooks/useObjectUrl.js';
import { formatBytes } from '../../utils/format.js';
import { isBrowserPreviewable } from '../../utils/validateFile.js';
import { Badge } from '../common/Badge.jsx';

/** Selected-file summary with a local thumbnail when the browser can render the format. */
export function FileCard({ file, onRemove, disabled }) {
  const previewable = isBrowserPreviewable(file);
  const url = useObjectUrl(file, previewable);
  const ext = file.name.split('.').pop()?.toUpperCase() ?? 'IMG';

  return (
    <div className="flex animate-fade-in items-center gap-4 rounded-xl border border-line bg-ink-950/50 p-3">
      <div className="checkerboard grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg ring-1 ring-white/10">
        {url ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <FileImage className="size-7 text-slate-500" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white" title={file.name}>
          {file.name}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Badge tone="brand">{ext}</Badge>
          <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
          {!previewable && <span className="text-xs text-slate-500">Preview generated on server</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Remove file"
        className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
