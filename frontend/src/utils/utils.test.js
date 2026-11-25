import { describe, expect, it } from 'vitest';
import { ApiError, apiUrl, parseEnvelope } from '../api/client.js';
import { formatBytes, formatDimensions, formatDuration, formatMegapixels } from './format.js';
import { validateFile } from './validateFile.js';

const fakeFile = (name, type, size = 1024) => ({ name, type, size });

describe('format', () => {
  it('formats bytes, durations and dimensions', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(25 * 1024 * 1024)).toBe('25 MB');
    expect(formatDuration(450)).toBe('450 ms');
    expect(formatDuration(12_340)).toBe('12.3 s');
    expect(formatDuration(125_000)).toBe('2m 5s');
    expect(formatDimensions(640, 480)).toBe('640 × 480');
    expect(formatMegapixels(2048, 2048)).toBe('4.19 MP');
  });
});

describe('validateFile', () => {
  it('accepts supported formats, including TIFF without a MIME type', () => {
    expect(validateFile(fakeFile('a.png', 'image/png'))).toBeNull();
    expect(validateFile(fakeFile('stack.TIF', ''))).toBeNull();
  });

  it('rejects unsupported, empty and oversized files', () => {
    expect(validateFile(fakeFile('a.gif', 'image/gif'))).toMatch(/Unsupported/);
    expect(validateFile(fakeFile('a.png', 'image/png', 0))).toMatch(/empty/);
    expect(validateFile(fakeFile('a.png', 'image/png', 26 * 1024 * 1024))).toMatch(/larger/);
    expect(validateFile(null)).toMatch(/choose/);
  });
});

describe('api client', () => {
  it('unwraps success envelopes', () => {
    expect(parseEnvelope(200, JSON.stringify({ success: true, data: { id: 1 } }))).toEqual({ id: 1 });
    expect(parseEnvelope(204, '')).toBeNull();
  });

  it('throws ApiError with server code and message', () => {
    const body = JSON.stringify({ success: false, error: { code: 'MODEL_UNAVAILABLE', message: 'nope' } });
    expect(() => parseEnvelope(422, body)).toThrow(ApiError);
    try {
      parseEnvelope(422, body);
    } catch (err) {
      expect(err.code).toBe('MODEL_UNAVAILABLE');
      expect(err.status).toBe(422);
    }
    expect(() => parseEnvelope(502, '<html>Bad gateway</html>')).toThrow(/502/);
  });

  it('builds API urls without double prefixes', () => {
    expect(apiUrl('/models')).toBe('/api/v1/models');
    expect(apiUrl('/api/v1/images/x/enhanced')).toBe('/api/v1/images/x/enhanced');
  });
});
