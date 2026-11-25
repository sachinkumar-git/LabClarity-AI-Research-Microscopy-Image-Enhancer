import { useRef, useState } from 'react';
import { ImageUp } from 'lucide-react';
import { ACCEPTED_TYPES, MAX_UPLOAD_MB } from '../../config.js';

const ACCEPT = Object.entries(ACCEPTED_TYPES).flatMap(([mime, exts]) => [mime, ...exts]).join(',');

/** Drag-and-drop / click / paste file picker. With `multiple`, `onFiles` receives an array. */
export function Dropzone({ onFile, onFiles, multiple = false, disabled = false, compact = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const pick = (files) => {
    if (disabled || !files?.length) return;
    if (multiple) onFiles(Array.from(files));
    else onFile(files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Upload a microscopy image"
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), inputRef.current?.click())}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onPaste={(e) => pick(e.clipboardData.files)}
      className={`group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed text-center transition-all duration-200
        ${compact ? 'gap-2 p-5' : 'gap-3 p-10'}
        ${dragging ? 'scale-[1.01] border-brand-400 bg-brand-400/10' : 'border-slate-700 bg-ink-950/40 hover:border-brand-400/60 hover:bg-brand-400/5'}
        ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <span
        className={`relative grid place-items-center rounded-2xl bg-gradient-to-br from-brand-400/20 to-accent-500/20 ring-1 ring-brand-400/30 transition-transform group-hover:-translate-y-0.5
          ${compact ? 'size-10' : 'size-14'}`}
      >
        <ImageUp className={`${compact ? 'size-5' : 'size-7'} text-brand-300`} aria-hidden />
      </span>
      <div className="relative">
        <p className="text-sm font-medium text-white">
          {dragging ? 'Drop to upload' : <>Drop {multiple ? 'images' : 'an image'} or <span className="text-brand-300">browse</span></>}
        </p>
        <p className="mt-1 text-xs text-slate-500">PNG, JPEG or TIFF (8/16-bit) · up to {MAX_UPLOAD_MB} MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
