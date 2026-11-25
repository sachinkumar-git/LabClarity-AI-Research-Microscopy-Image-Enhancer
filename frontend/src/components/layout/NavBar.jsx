import { AnimatePresence, motion } from 'motion/react';
import { Menu, Microscope, Moon, Sun, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useSettings } from '../../context/SettingsContext.jsx';
import { Tooltip } from '../common/Tooltip.jsx';
import { AccountMenu } from './AccountMenu.jsx';
import { NAV_ITEMS, sectionFor } from './navItems.js';
import { NotificationsMenu } from './NotificationsMenu.jsx';

function NavItems({ vertical = false, onNavigate }) {
  const { pathname } = useLocation();
  const section = sectionFor(pathname);
  return NAV_ITEMS.map(({ to, label, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => {
        const active = isActive || section === to;
        return `relative rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 ${vertical ? 'block' : ''}
          ${active ? 'text-brand-300' : 'text-slate-300 hover:text-white'}`;
      }}
    >
      {({ isActive }) => (
        <>
          {(isActive || section === to) && (
            <motion.span
              layoutId={vertical ? 'nav-pill-mobile' : 'nav-pill'}
              className="absolute inset-0 rounded-xl bg-brand-400/12"
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            />
          )}
          <span className="relative">{label}</span>
        </>
      )}
    </NavLink>
  ));
}

export function NavBar() {
  const { resolvedTheme, toggleTheme } = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const dark = resolvedTheme === 'dark';

  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink-900/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <Link to="/" className="group flex shrink-0 items-center gap-2" aria-label="LabClarity AI overview">
          <Microscope className="size-7 text-brand-600 transition-transform duration-300 group-hover:-rotate-6" aria-hidden />
          <span className="text-xl font-bold tracking-tight text-white">LabClarity <span className="text-accent-400">AI</span></span>
        </Link>
        <span className="mx-2 hidden h-7 w-px bg-line xl:block" aria-hidden />
        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Main"><NavItems /></nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <span className="hidden sm:inline-flex"><Tooltip label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
            <button type="button" onClick={toggleTheme} className="grid size-10 place-items-center rounded-xl border border-line bg-ink-900/70 text-slate-300 transition hover:border-brand-400/40 hover:text-white active:scale-95" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={dark ? 'moon' : 'sun'} initial={{ opacity: 0, rotate: -45 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 45 }} transition={{ duration: 0.18 }}>
                  {dark ? <Moon className="size-4.5" /> : <Sun className="size-4.5" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </Tooltip></span>
          <NotificationsMenu />
          <AccountMenu />
          <button type="button" onClick={() => setMobileOpen((o) => !o)} className="grid size-10 place-items-center rounded-xl text-slate-300 hover:bg-white/5 xl:hidden" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen}>
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            aria-label="Main"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line xl:hidden"
          >
            <div className="grid gap-0.5 p-3 sm:grid-cols-2"><NavItems vertical onNavigate={() => setMobileOpen(false)} /></div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
