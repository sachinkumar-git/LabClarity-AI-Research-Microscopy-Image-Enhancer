/** Bell menu listing real run outcomes from the API; unread state is kept in this browser. */
import { Bell, CircleCheck, CircleX, LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { listRuns } from '../../api/researchApi.js';
import { timeAgo } from '../../utils/format.js';
import { Dropdown } from '../common/Dropdown.jsx';
import { Tooltip } from '../common/Tooltip.jsx';

const SEEN_KEY = 'labclarity.notificationsSeenAt';
const readSeen = () => {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
};

function useRecentRuns() {
  const [runs, setRuns] = useState(null);
  const load = useCallback(() => listRuns({ limit: 8 }).then(setRuns).catch(() => setRuns((r) => r ?? [])), []);
  useEffect(() => {
    load();
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), 20_000);
    return () => clearInterval(timer);
  }, [load]);
  return { runs, load };
}

export function NotificationsMenu() {
  const navigate = useNavigate();
  const { runs, load } = useRecentRuns();
  const [seenAt, setSeenAt] = useState(readSeen);
  const finished = (runs ?? []).filter((r) => r.completedAt);
  const unread = finished.filter((r) => new Date(r.completedAt).getTime() > seenAt).length;

  const markRead = () => {
    const now = Date.now();
    setSeenAt(now);
    try {
      localStorage.setItem(SEEN_KEY, String(now));
    } catch {
      /* ignore */
    }
  };

  return (
    <Dropdown
      width="w-80"
      trigger={(props) => (
        <Tooltip label={unread ? `${unread} new run result${unread === 1 ? '' : 's'}` : 'Notifications'}>
          <button {...props} onClick={(e) => { props.onClick(e); load(); }} className="relative grid size-10 place-items-center rounded-xl border border-line bg-ink-900/70 text-slate-300 transition hover:border-brand-400/40 hover:text-white active:scale-95" aria-label="Notifications">
            <Bell className="size-4.5" />
            {unread > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-brand-400 ring-2 ring-ink-900" />}
          </button>
        </Tooltip>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-2.5 py-2">
            <p className="text-sm font-semibold text-white">Run activity</p>
            <button type="button" onClick={markRead} disabled={!unread} className="text-xs text-brand-300 hover:underline disabled:text-slate-500 disabled:no-underline">Mark all read</button>
          </div>
          {runs === null && <p className="px-2.5 py-4 text-xs text-slate-500">Loading…</p>}
          {runs?.length === 0 && <p className="px-2.5 py-4 text-xs text-slate-500">No runs yet. Results will appear here.</p>}
          <ul className="max-h-80 overflow-y-auto">
            {(runs ?? []).map((r) => {
              const Icon = r.status === 'completed' ? CircleCheck : r.status === 'failed' ? CircleX : LoaderCircle;
              const tone = r.status === 'completed' ? 'text-emerald-400' : r.status === 'failed' ? 'text-rose-400' : 'text-brand-400 animate-spin';
              const isNew = r.completedAt && new Date(r.completedAt).getTime() > seenAt;
              return (
                <li key={r.id}>
                  <button type="button" role="menuitem" onClick={() => { close(); navigate(`/runs/${r.id}`); }} className="flex w-full gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/5 focus:bg-white/5 focus:outline-none">
                    <Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-200">{r.label ?? r.model}</span>
                      <span className="block truncate text-[11px] text-slate-500">{r.originalName} · {r.status} · {timeAgo(r.completedAt ?? r.createdAt)}</span>
                    </span>
                    {isNew && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-400" aria-label="new" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Dropdown>
  );
}
