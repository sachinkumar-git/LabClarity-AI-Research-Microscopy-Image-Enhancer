import { ArrowRight, ChartNoAxesColumnIncreasing, Layers, Play, Sparkles, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { assetUrl } from '../../api/imageApi.js';
import { listRuns } from '../../api/researchApi.js';
import { useApi } from '../../hooks/useApi.js';
import { useZoomPan } from '../../hooks/useZoomPan.js';
import { Button } from '../common/Button.jsx';
import { CompareSlider } from '../compare/CompareSlider.jsx';
import { EASE } from '../motion/Reveal.jsx';

const DEMO = {
  original: '/demo/demo-original.png',
  enhanced: '/demo/demo-enhanced.png',
  caption: 'Synthetic demo sample · NLM denoise + bicubic ×4 · processed by LabClarity',
  scale: 4,
};
const FEATURES = [
  { icon: Zap, label: 'Super-Resolution' },
  { icon: Layers, label: 'Denoising' },
  { icon: ChartNoAxesColumnIncreasing, label: 'Quantitative Analysis' },
];
const rise = (delay) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.55, delay, ease: EASE } } });

function Showcase() {
  const view = useZoomPan();
  const { data } = useApi((signal) => listRuns({ status: 'completed', limit: 1 }, signal), 'hero');
  const latest = data?.[0];
  const sample = latest
    ? { original: assetUrl(latest.links.preview), enhanced: assetUrl(latest.links.enhanced), caption: `Your latest result · ${latest.label ?? latest.model}`, scale: latest.scale, runId: latest.id }
    : DEMO;

  return (
    <motion.div {...rise(0.15)} className="relative">
      <div className="absolute -inset-10 -z-10 rounded-[48%] bg-gradient-to-br from-brand-400/25 via-accent-400/15 to-transparent blur-2xl" aria-hidden />
      <div className="rounded-3xl border border-line bg-ink-900 p-2.5 shadow-[var(--panel-shadow-hover)]">
        <CompareSlider
          key={sample.enhanced}
          originalSrc={sample.original}
          enhancedSrc={sample.enhanced}
          aspect="22 / 15"
          view={view}
          pixelated
          sweep
          labels={{ original: 'Original', enhanced: `Enhanced (${sample.scale}×)` }}
          className="rounded-2xl"
        />
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        {sample.runId ? <Link to={`/runs/${sample.runId}`} className="hover:text-brand-300">{sample.caption} →</Link> : sample.caption}
      </p>
    </motion.div>
  );
}

export function HeroSection() {
  const scrollToHow = () => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <section className="mx-auto grid max-w-[1440px] items-center gap-12 overflow-x-clip px-4 pt-12 pb-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
      <div>
        <motion.span {...rise(0)} className="inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-ink-900/80 px-3.5 py-1.5 text-sm font-medium text-slate-200">
          <Sparkles className="size-4 text-brand-400" aria-hidden /> AI-Powered Microscopy Platform
        </motion.span>
        <motion.h1 {...rise(0.05)} className="mt-6 text-4xl leading-[1.08] font-bold tracking-tight text-balance text-white sm:text-5xl xl:text-[3.1rem] 2xl:text-[3.4rem]">
          Uncover More Detail <br className="hidden sm:block" />in Every <span className="text-gradient">Microscopy Image</span>
        </motion.h1>
        <motion.p {...rise(0.1)} className="mt-5 max-w-xl text-lg text-pretty text-slate-400">
          Enhance, restore and analyze microscopic images using state-of-the-art deep learning models, with
          measured quality metrics and a full audit trail for every result.
        </motion.p>
        <motion.div {...rise(0.15)} className="mt-8 flex flex-wrap gap-3">
          <Button as={Link} to="/enhance" size="lg" iconRight={ArrowRight}>Open Workspace</Button>
          <Button variant="secondary" size="lg" icon={Play} onClick={scrollToHow}>See How it Works</Button>
        </motion.div>
        <motion.ul {...rise(0.2)} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-300">
          {FEATURES.map(({ icon: Icon, label }, i) => (
            <li key={label} className="flex items-center gap-2">
              {i > 0 && <span className="mr-4 hidden h-4 w-px bg-line sm:block" aria-hidden />}
              <Icon className="size-4.5 text-brand-400" aria-hidden /> {label}
            </li>
          ))}
        </motion.ul>
      </div>
      <Showcase />
    </section>
  );
}
