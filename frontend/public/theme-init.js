// Applies saved theme/motion preferences before first paint (no flash). External file: CSP-safe.
(function () {
  var prefs = {};
  try { prefs = JSON.parse(localStorage.getItem('labclarity.prefs') || '{}'); } catch (e) { prefs = {}; }
  var theme = prefs.theme || 'light';
  if (theme === 'system') theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  if (prefs.motion && prefs.motion !== 'system') document.documentElement.setAttribute('data-motion', prefs.motion);
})();
