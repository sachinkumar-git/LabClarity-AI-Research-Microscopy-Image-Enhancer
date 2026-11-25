/** Model catalogue and file-link helpers. */
import { apiUrl, request } from './client.js';

export const listModels = (signal) => request('/models', { signal });

/** Resolves a link from an API payload into a loadable URL. */
export const assetUrl = (link, { download = false } = {}) =>
  link ? `${apiUrl(link)}${download ? '?download=1' : ''}` : null;
