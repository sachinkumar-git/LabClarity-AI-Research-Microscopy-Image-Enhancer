/** Primary navigation (order matches the product design). */
export const NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/enhance', label: 'Enhance' },
  { to: '/compare', label: 'Compare' },
  { to: '/batches', label: 'Batch Processing' },
  { to: '/models', label: 'Models' },
  { to: '/projects', label: 'Projects' },
  { to: '/history', label: 'History' },
];

/** Routes that belong to a nav section without being its exact path. */
export function sectionFor(pathname) {
  if (pathname.startsWith('/runs/')) return '/history';
  if (pathname.startsWith('/batches/')) return '/batches';
  if (pathname.startsWith('/projects/')) return '/projects';
  return null;
}
