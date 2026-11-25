import { motion } from 'motion/react';
import { OP_LABELS } from '../../utils/pipeline.js';

/** Single-series horizontal bars with direct value labels (no legend needed). */
export function UsageBars({ items }) {
  if (!items.length) return <p className="text-sm text-slate-500">No runs yet.</p>;
  const max = Math.max(...items.map((i) => i.count));
  return (
    <ul className="space-y-2.5" aria-label="Pipeline operations used, by number of runs">
      {items.map((item) => (
        <li key={item.op} className="grid grid-cols-[120px_1fr_40px] items-center gap-3 text-xs">
          <span className="truncate text-slate-300">{OP_LABELS[item.op] ?? item.op}</span>
          <motion.span className="h-3 rounded-r-[4px] bg-series-1" initial={{ width: 0 }} whileInView={{ width: `${Math.max((item.count / max) * 100, 2)}%` }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} title={`${item.count} runs`} />
          <span className="text-right font-mono text-slate-300">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}
