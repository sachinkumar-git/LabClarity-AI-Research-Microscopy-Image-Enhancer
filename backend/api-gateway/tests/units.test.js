import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectImageType } from '../src/utils/fileSignature.js';
import { sanitizeFilename } from '../src/services/jobService.js';
import { createStorageService } from '../src/services/storageService.js';
import { TaskQueue } from '../src/utils/TaskQueue.js';
import { FAKE_PNG_BYTES, JPEG_BYTES, PNG_BYTES, TIFF_BYTES } from './helpers/fixtures.js';

describe('fileSignature.detectImageType', () => {
  it('identifies PNG, JPEG and TIFF by magic bytes', () => {
    assert.equal(detectImageType(PNG_BYTES), 'image/png');
    assert.equal(detectImageType(JPEG_BYTES), 'image/jpeg');
    assert.equal(detectImageType(TIFF_BYTES), 'image/tiff');
  });

  it('returns null for unknown or empty content', () => {
    assert.equal(detectImageType(FAKE_PNG_BYTES), null);
    assert.equal(detectImageType(Buffer.alloc(0)), null);
    assert.equal(detectImageType('not a buffer'), null);
  });
});

describe('sanitizeFilename', () => {
  it('strips directories and unsafe characters', () => {
    assert.equal(sanitizeFilename('../../etc/passwd'), 'passwd');
    assert.equal(sanitizeFilename('C:\\x\\cell "A".tif'), 'cell _A_.tif');
    assert.equal(sanitizeFilename('...hidden'), 'hidden');
    assert.equal(sanitizeFilename(''), 'image');
  });
});

describe('storageService', () => {
  const storage = createStorageService({ storageDir: './storage-test' });

  it('rejects keys that could escape the storage root', () => {
    assert.throws(() => storage.pathFor('../package.json'), /Invalid storage key/);
    assert.throws(() => storage.pathFor('originals/../../x.png'), /Invalid storage key/);
  });

  it('resolves well-formed keys inside the root', () => {
    const p = storage.pathFor('results/3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f.png');
    assert.ok(p.startsWith(storage.root));
  });
});

describe('TaskQueue', () => {
  it('never exceeds the configured concurrency and drains fully', async () => {
    const queue = new TaskQueue({ concurrency: 2 });
    let active = 0;
    let peak = 0;
    let done = 0;
    for (let i = 0; i < 6; i += 1) {
      queue.push(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 5));
        active -= 1;
        done += 1;
      });
    }
    await queue.onIdle();
    assert.equal(peak, 2);
    assert.equal(done, 6);
  });

  it('reports task errors without stopping the queue', async () => {
    const errors = [];
    const queue = new TaskQueue({ onError: (e) => errors.push(e.message) });
    let ran = false;
    queue.push(() => {
      throw new Error('boom');
    });
    queue.push(() => {
      ran = true;
    });
    await queue.onIdle();
    assert.deepEqual(errors, ['boom']);
    assert.ok(ran);
  });
});
