/** Streams a stored file with caching and (optionally) an attachment filename. */
const CACHE_HEADER = 'private, max-age=3600';

export function sendStoredFile(res, storage, key, { contentType, downloadName } = {}) {
  const headers = { 'Cache-Control': CACHE_HEADER };
  if (contentType) headers['Content-Type'] = contentType;
  if (downloadName) headers['Content-Disposition'] = `attachment; filename="${downloadName}"`;
  return res.sendFile(storage.pathFor(key), { headers });
}
