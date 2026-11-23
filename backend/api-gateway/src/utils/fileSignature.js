/**
 * Detects image type from magic bytes. Never trust client-supplied
 * file extensions or Content-Type headers.
 */
const SIGNATURES = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/tiff', bytes: [0x49, 0x49, 0x2a, 0x00] }, // little-endian TIFF
  { mime: 'image/tiff', bytes: [0x4d, 0x4d, 0x00, 0x2a] }, // big-endian TIFF
];

export function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  const match = SIGNATURES.find(({ bytes }) =>
    buffer.length >= bytes.length && bytes.every((byte, i) => buffer[i] === byte),
  );
  return match?.mime ?? null;
}
