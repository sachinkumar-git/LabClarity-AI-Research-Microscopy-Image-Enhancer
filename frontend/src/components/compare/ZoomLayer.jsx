/**
 * Full-bleed image layer driven by a shared zoom/pan transform.
 * `crop` (source-pixel ROI + full size) shows only that region of a full-size image,
 * so an original can be aligned exactly with an ROI-processed output.
 */
export function ZoomLayer({ src, alt, transform = 'none', pixelated = false, crop = null }) {
  const rendering = pixelated ? 'pixelated' : 'auto';
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="size-full transition-transform duration-75 ease-out" style={{ transform, transformOrigin: 'center' }}>
        {crop ? (
          <div className="relative size-full overflow-hidden">
            <img
              src={src}
              alt={alt}
              draggable={false}
              className="absolute max-w-none"
              style={{
                width: `${(crop.fullWidth / crop.width) * 100}%`,
                height: `${(crop.fullHeight / crop.height) * 100}%`,
                left: `${(-crop.x / crop.width) * 100}%`,
                top: `${(-crop.y / crop.height) * 100}%`,
                imageRendering: rendering,
              }}
            />
          </div>
        ) : (
          <img src={src} alt={alt} draggable={false} className="size-full object-contain" style={{ imageRendering: rendering }} />
        )}
      </div>
    </div>
  );
}
