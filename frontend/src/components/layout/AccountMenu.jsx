/** Avatar menu: workspace settings, theme, service status. No accounts, so no fake profile. */
import { Activity, ChevronDown, Moon, Settings, Sun } from 'lucide-react';
import { useState } from 'react';
import { useCatalog } from '../../context/CatalogContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { Dropdown, MenuItem } from '../common/Dropdown.jsx';
import { SettingsModal } from './SettingsModal.jsx';

export function initials(name) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'LC';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function AccountMenu() {
  const { prefs, resolvedTheme, toggleTheme } = useSettings();
  const { runtime, error } = useCatalog();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dark = resolvedTheme === 'dark';
  const service = error || !runtime ? 'AI service offline' : `AI service online · ${runtime.device === 'cuda' ? runtime.gpu || 'GPU' : 'CPU'}`;

  return (
    <>
      <Dropdown
        width="w-64"
        trigger={(props) => (
          <button {...props} className="flex items-center gap-1.5 rounded-full p-0.5 pr-1 transition hover:bg-white/5 active:scale-95" aria-label="Workspace menu">
            <span className="grid size-10 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-on-brand">{initials(prefs.displayName)}</span>
            <ChevronDown className="hidden size-4 text-slate-400 sm:block" aria-hidden />
          </button>
        )}
      >
        {(close) => (
          <>
            <div className="border-b border-line px-2.5 pt-1.5 pb-2.5">
              <p className="truncate text-sm font-semibold text-white">{prefs.displayName || 'Local workspace'}</p>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Activity className={`size-3 ${error || !runtime ? 'text-rose-400' : 'text-emerald-400'}`} aria-hidden /> {service}
              </p>
            </div>
            <div className="pt-1.5">
              <MenuItem icon={Settings} close={close} onSelect={() => setSettingsOpen(true)} hint="Theme, motion, default model">Workspace settings</MenuItem>
              <MenuItem icon={dark ? Sun : Moon} close={close} onSelect={toggleTheme}>{dark ? 'Light mode' : 'Dark mode'}</MenuItem>
            </div>
          </>
        )}
      </Dropdown>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
