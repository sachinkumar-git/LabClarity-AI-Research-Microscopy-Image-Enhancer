/**
 * Full-bleed image layer that zooms around a shared origin, so stacked layers
 * (slider) and side-by-side panes stay perfectly aligned while inspecting detail.
 */
export function ZoomLayer({ src, alt, zoom = 1, origin = '50% 50%', pixelated = false }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="size-full object-contain transition-transform duration-150 ease-out"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: origin,
          imageRendering: pixelated ? 'pixelated' : 'auto',
        }}
      />
    </div>
  );
}
