import { motion } from 'motion/react';
import { useState } from 'react';
import { CircleX } from 'lucide-react';
import { ChartTooltip } from './ChartTooltip.jsx';

const W = 640;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 32 };
const SERIES = [
  { key: 'completed', label: 'Completed', color: 'var(--color-series-1)' },
  { key: 'failed', label: 'Failed', color: 'var(--color-status-critical)' },
];

function niceMax(v) {
  if (v <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / step) * step;
}

/** Runs per day, stacked by outcome. Hover a column for exact values; a table mirrors the data. */
export function TimelineChart({ days }) {
  const [hover, setHover] = useState(null);
  const max = niceMax(Math.max(...days.map((d) => d.completed + d.failed), 0));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const col = plotW / days.length;
  const barW = Math.min(28, col * 0.6);
  const y = (v) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];

  return (
    <div className="relative">
      <div className="mb-2 flex gap-4 text-xs text-slate-400">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
            {s.key === 'failed' && <CircleX className="size-3" aria-hidden />}{s.label}
          </span>
        ))}
      </div>
      <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Runs per day for the last 14 days, by outcome">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--color-chart-axis)' : 'var(--color-chart-grid)'} />
            <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" className="fill-slate-500 text-[10px]">{t}</text>
          </g>
        ))}
        {days.map((d, i) => {
          const cx = PAD.left + col * i + col / 2;
          const x = cx - barW / 2;
          const cH = (d.completed / max) * plotH;
          const fH = (d.failed / max) * plotH;
          const gap = cH > 0 && fH > 0 ? 2 : 0; // 2px surface gap between stacked segments
          return (
            <g key={d.date}>
              <motion.g style={{ transformOrigin: 'bottom', transformBox: 'fill-box' }} initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}>
              {cH > 0 && <path d={roundedTop(x, y(d.completed), barW, cH, fH > 0 ? 0 : 4)} fill={SERIES[0].color} />}
              {fH > 0 && <path d={roundedTop(x, y(d.completed + d.failed), barW, fH - gap, 4)} fill={SERIES[1].color} />}
              </motion.g>
              {(i % 2 === 0 || i === days.length - 1) && (
                <text x={cx} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[10px]">{d.date.slice(5)}</text>
              )}
              <rect
                x={PAD.left + col * i} y={PAD.top} width={col} height={plotH} fill="transparent" tabIndex={0}
                aria-label={`${d.date}: ${d.completed} completed, ${d.failed} failed`}
                onPointerEnter={() => setHover({ d, x: (cx / W) * 100, top: y(d.completed + d.failed) })}
                onFocus={() => setHover({ d, x: (cx / W) * 100, top: y(d.completed + d.failed) })}
                onPointerLeave={() => setHover(null)} onBlur={() => setHover(null)}
              />
            </g>
          );
        })}
      </svg>
      {hover && (
        <ChartTooltip
          x={`${hover.x}%`} y={`${(hover.top / H) * 100}%`}
          title={hover.d.date}
          rows={SERIES.map((s) => ({ label: s.label.toLowerCase(), value: hover.d[s.key], color: s.color }))}
        />
      )}
      </div>
      <table className="sr-only">
        <caption>Runs per day</caption>
        <thead><tr><th>Date</th><th>Completed</th><th>Failed</th></tr></thead>
        <tbody>{days.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.completed}</td><td>{d.failed}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

/** Bar path anchored at the baseline with an optional rounded top (data-end). */
function roundedTop(x, top, w, h, r) {
  const rr = Math.min(r, h, w / 2);
  const bottom = top + h;
  return `M${x},${bottom} V${top + rr} Q${x},${top} ${x + rr},${top} H${x + w - rr} Q${x + w},${top} ${x + w},${top + rr} V${bottom} Z`;
}
