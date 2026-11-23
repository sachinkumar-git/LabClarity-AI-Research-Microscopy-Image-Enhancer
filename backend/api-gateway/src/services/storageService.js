/**
 * Local filesystem storage with random, server-generated file keys.
 * Keys are validated so no request can escape the storage root.
 * Swap this module for an S3/GCS implementation with the same interface.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const BUCKETS = Object.freeze({ ORIGINALS: 'originals', PREVIEWS: 'previews', RESULTS: 'results' });
const KEY_PATTERN = /^(originals|previews|results)\/[0-9a-f-]{36}\.(png|jpg|tif)$/;

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

    /** Persists a buffer and returns its storage key. */
    async save(bucket, buffer, ext) {
      const key = `${bucket}/${randomUUID()}${ext}`;
      await writeFile(resolveKey(key), buffer, { flag: 'wx' });
      return key;
    },

    read(key) {
      return readFile(resolveKey(key));
    },

    /** Absolute path for streaming a stored file. */
    pathFor(key) {
      return resolveKey(key);
    },

    async remove(key) {
      if (key) await rm(resolveKey(key), { force: true });
    },
  };
}
