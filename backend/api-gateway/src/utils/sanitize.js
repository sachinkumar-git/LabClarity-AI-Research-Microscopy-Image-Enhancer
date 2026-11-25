/** Keeps a display-safe filename: strips paths, control chars and odd symbols. */
export function sanitizeFilename(name = 'image') {
  const base = String(name).split(/[\\/]/).pop();
  const cleaned = base.replace(/[^\w.\- ]+/g, '_').replace(/^\.+/, '').slice(0, 200);
  return cleaned || 'image';
}
