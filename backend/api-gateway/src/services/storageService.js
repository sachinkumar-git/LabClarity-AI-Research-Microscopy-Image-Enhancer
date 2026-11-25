/**
 * Local filesystem storage with random, server-generated file keys.
 * Keys are validated so no request can escape the storage root. Originals can be write-protected.
 * Swap this module for an S3/GCS implementation with the same interface.
 */
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const BUCKETS = Object.freeze({ ORIGINALS: 'originals', PREVIEWS: 'previews', RESULTS: 'results' });
const KEY_PATTERN = /^(originals|previews|results)\/[0-9a-f-]{36}\.(png|jpg|tif)$/;

export const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

export function createStorageService({ storageDir }) {
  const root = path.resolve(storageDir);

  function resolveKey(key) {
    if (!KEY_PATTERN.test(key)) throw new Error(`Invalid storage key: ${key}`);
    const fullPath = path.resolve(root, key);
    if (!fullPath.startsWith(root + path.sep)) throw new Error('Storage path traversal blocked');
    return fullPath;
  }

  return {
    root,

    async init() {
      await Promise.all(Object.values(BUCKETS).map((b) => mkdir(path.join(root, b), { recursive: true })));
    },

    /** Persists a buffer (never overwriting) and returns its storage key. */
    async save(bucket, buffer, ext) {
      const key = `${bucket}/${randomUUID()}${ext}`;
      await writeFile(resolveKey(key), buffer, { flag: 'wx' });
      return key;
    },

    /** Marks a stored file read-only (used for scientific originals). */
    async protect(key) {
      await chmod(resolveKey(key), 0o444);
    },

    read(key) {
      return readFile(resolveKey(key));
    },

    /** Streams a stored file through SHA-256 (integrity verification). */
    hash(key) {
      return new Promise((resolve, reject) => {
        const digest = createHash('sha256');
        createReadStream(resolveKey(key))
          .on('data', (chunk) => digest.update(chunk))
          .on('end', () => resolve(digest.digest('hex')))
          .on('error', reject);
      });
    },

    /** Absolute path for streaming a stored file. */
    pathFor(key) {
      return resolveKey(key);
    },

    async remove(key) {
      if (!key) return;
      const fullPath = resolveKey(key);
      await chmod(fullPath, 0o644).catch(() => {}); // read-only files cannot be unlinked on Windows
      await rm(fullPath, { force: true });
    },
  };
}
