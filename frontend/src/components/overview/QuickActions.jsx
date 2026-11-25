import { ArrowRight, Cpu, Image, Layers, Network } from 'lucide-react';
import { Link } from 'react-router';
import { Stagger, StaggerItem } from '../motion/Reveal.jsx';

const ACTIONS = [
  { to: '/enhance', icon: Image, title: 'Enhance Image', text: 'Upscale and restore details with AI models', tint: 'bg-emerald-500/10 text-emerald-400', card: 'from-emerald-500/[0.06]' },
  { to: '/compare', icon: Layers, title: 'Compare Images', text: 'Visualization and side-by-side analysis', tint: 'bg-amber-500/12 text-amber-400', card: 'from-amber-500/[0.06]' },
  { to: '/batches', icon: Network, title: 'Batch Processing', text: 'Process multiple images with a single job', tint: 'bg-brand-400/12 text-brand-400', card: 'from-brand-400/[0.06]' },
  { to: '/models', icon: Cpu, title: 'Model Library', text: 'Explore and choose pretrained AI models', tint: 'bg-violet-500/12 text-violet-500', card: 'from-violet-500/[0.06]' },
];

export function QuickActions() {
  return (
    <Stagger as="section" className="mx-auto grid max-w-[1440px] gap-4 px-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-4" aria-label="Quick actions">
      {ACTIONS.map(({ to, icon: Icon, title, text, tint, card }) => (
        <StaggerItem key={to} className="min-w-0">
          <Link to={to} className={`glass card-interactive group flex items-center gap-4 bg-gradient-to-br ${card} to-transparent p-5`}>
            <span className={`grid size-14 shrink-0 place-items-center rounded-full ${tint} transition-transform duration-300 group-hover:scale-105`}>
              <Icon className="size-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-semibold text-white">{title}</span>
              <span className="block text-sm text-slate-400">{text}</span>
            </span>
            <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line text-slate-300 transition-all duration-200 group-hover:border-brand-400/50 group-hover:text-brand-300">
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
