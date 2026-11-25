import { crc32, deflateSync } from 'node:zlib';

/** Minimal byte fixtures. The gateway only inspects magic bytes; pixel decoding happens in the AI service. */
const pad = (header) => Buffer.concat([Buffer.from(header), Buffer.alloc(64, 1)]);

export const PNG_BYTES = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
export const JPEG_BYTES = pad([0xff, 0xd8, 0xff, 0xe0]);
export const TIFF_BYTES = pad([0x49, 0x49, 0x2a, 0x00]);
export const FAKE_PNG_BYTES = Buffer.from('<?php echo "not an image"; ?>');

/** A genuinely decodable RGB PNG (for PDF embedding tests). */

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

export function realPng(size = 8) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit, RGB
  const rows = Array.from({ length: size }, (_, y) =>
    Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3, (y * 30) % 255)]));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0)),
  ]);
}
