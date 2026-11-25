/**
 * Workspace preferences (theme, motion, default model, display name), stored in this browser.
 * LabClarity has no user accounts, so nothing here is sent to the server.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';

const KEY = 'labclarity.prefs';
const DEFAULTS = { theme: 'light', motion: 'system', defaultSrModel: '', displayName: '' };
const SettingsContext = createContext(null);

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable (private mode): preferences last for this session only */
  }
}

const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export function SettingsProvider({ children }) {
  const [prefs, setPrefs] = useState(load);
  const [osDark, setOsDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = (e) => setOsDark(e.matches);
    mq?.addEventListener('change', onChange);
    return () => mq?.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme = prefs.theme === 'system' ? (osDark ? 'dark' : 'light') : prefs.theme;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
    if (prefs.motion === 'system') root.removeAttribute('data-motion');
    else root.setAttribute('data-motion', prefs.motion);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'dark' ? '#07110f' : '#f2f7f5');
  }, [resolvedTheme, prefs.motion]);

  const update = useCallback((patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setPrefs({ ...DEFAULTS });
  }, []);

  const value = useMemo(() => ({
    prefs, update, reset, resolvedTheme,
    toggleTheme: () => update({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' }),
  }), [prefs, update, reset, resolvedTheme]);

  const reducedMotion = { system: 'user', reduce: 'always', full: 'never' }[prefs.motion] ?? 'user';
  return (
    <SettingsContext.Provider value={value}>
      <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside <SettingsProvider>');
  return value;
}
