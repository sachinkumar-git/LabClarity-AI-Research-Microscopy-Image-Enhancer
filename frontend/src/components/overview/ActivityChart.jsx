import { motion } from 'motion/react';
import { useId, useState } from 'react';
import { ChartTooltip } from '../dashboard/ChartTooltip.jsx';

const W = 560;
const H = 200;
const PAD = { top: 14, right: 14, bottom: 26, left: 34 };
const niceMax = (v) => (v <= 4 ? 4 : Math.ceil(v / 10 ** Math.floor(Math.log10(v))) * 10 ** Math.floor(Math.log10(v)));
const dayLabel = (iso, span) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, span <= 7 ? { weekday: 'short' } : { month: 'numeric', day: 'numeric' });

/** Single-series area chart (runs per day) with a snapping crosshair tooltip and a data table. */
export function ActivityChart({ days }) {
  const gradientId = useId();
  const [hover, setHover] = useState(null);
  const max = niceMax(Math.max(...days.map((d) => d.runs), 0));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (days.length === 1 ? plotW / 2 : (i / (days.length - 1)) * plotW);
  const y = (v) => PAD.top + plotH - (v / max) * plotH;
  const points = days.map((d, i) => [x(i), y(d.runs)]);
  const line = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px},${py}`).join(' ');
  const area = `${line} L${x(days.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const labelEvery = Math.ceil(days.length / 7);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((sx - PAD.left) / plotW) * (days.length - 1));
    setHover(Math.min(days.length - 1, Math.max(0, i)));
  };
  const h = hover === null ? null : days[hover];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" role="img" aria-label="Runs per day"
        onPointerMove={onMove} onPointerLeave={() => setHover(null)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') setHover((v) => Math.min(days.length - 1, (v ?? -1) + 1));
          if (e.key === 'ArrowLeft') setHover((v) => Math.max(0, (v ?? days.length) - 1));
        }}
        onBlur={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, max / 4, max / 2, (3 * max) / 4, max].map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)'} />
            <text x={PAD.left - 8} y={y(t) + 3} textAnchor="end" className="fill-slate-500 text-[10px]">{Number.isInteger(t) ? t : ''}</text>
          </g>
        ))}
        <motion.path d={area} fill={`url(#${gradientId})`} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }} />
        <motion.path
          d={line} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        {points.map(([px, py], i) => (
          <circle key={days[i].date} cx={px} cy={py} r={hover === i ? 5 : 3.5} fill="var(--series-1)" stroke="var(--ink-900)" strokeWidth="2" className="transition-all duration-150" />
        ))}
        {h && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} stroke="var(--chart-axis)" strokeDasharray="3 3" />}
        {days.map((d, i) => (i % labelEvery === 0 || i === days.length - 1) && (
          <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[10px]">{dayLabel(d.date, days.length)}</text>
        ))}
      </svg>
      {h && (
        <ChartTooltip
          x={`${(x(hover) / W) * 100}%`} y={`${(y(h.runs) / H) * 100}%`}
          title={new Date(`${h.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          rows={[{ label: 'runs', value: h.runs }, { label: 'completed', value: h.completed }, { label: 'failed', value: h.failed }]}
        />
      )}
      <table className="sr-only">
        <caption>Runs per day</caption>
        <thead><tr><th>Date</th><th>Runs</th><th>Completed</th><th>Failed</th></tr></thead>
        <tbody>{days.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.runs}</td><td>{d.completed}</td><td>{d.failed}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
