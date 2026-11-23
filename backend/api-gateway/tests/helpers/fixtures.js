/** Minimal byte fixtures. The gateway only inspects magic bytes; pixel decoding happens in the AI service. */
const pad = (header) => Buffer.concat([Buffer.from(header), Buffer.alloc(64, 1)]);

export const PNG_BYTES = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
export const JPEG_BYTES = pad([0xff, 0xd8, 0xff, 0xe0]);
export const TIFF_BYTES = pad([0x49, 0x49, 0x2a, 0x00]);
export const FAKE_PNG_BYTES = Buffer.from('<?php echo "not an image"; ?>');
