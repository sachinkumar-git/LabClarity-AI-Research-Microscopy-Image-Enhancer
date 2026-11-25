import { ChevronDown, TrendingUp } from 'lucide-react';
import { Dropdown, MenuItem } from '../common/Dropdown.jsx';
import { Skeleton } from '../common/Skeleton.jsx';
import { ActivityChart } from './ActivityChart.jsx';

const RANGES = [7, 14, 30];

/** "Workspace Activity" card: range selector + runs-per-day chart. */
export function ActivityPanel({ stats, days, onDaysChange, loading }) {
  return (
    <section className="glass p-5">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-400/10 text-brand-400"><TrendingUp className="size-5" aria-hidden /></span>
          <div>
            <h2 className="text-base font-semibold text-white">Workspace Activity</h2>
            <p className="text-xs text-slate-500">Processing runs over the last {days} days</p>
          </div>
        </div>
        <Dropdown
          width="w-40"
          trigger={(props, open) => (
            <button {...props} className="flex items-center gap-1.5 rounded-lg border border-line bg-ink-900/70 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-brand-400/40">
              Last {days} days <ChevronDown className={`size-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
            </button>
          )}
        >
          {(close) => RANGES.map((d) => (
            <MenuItem key={d} close={close} onSelect={() => onDaysChange(d)}>
              <span className={d === days ? 'font-semibold text-brand-300' : ''}>Last {d} days</span>
            </MenuItem>
          ))}
        </Dropdown>
      </header>
      {!stats ? <Skeleton className="h-48 w-full" /> : (
        <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : ''}`}>
          <ActivityChart key={days} days={stats.timeline} />
        </div>
      )}
    </section>
  );
}
