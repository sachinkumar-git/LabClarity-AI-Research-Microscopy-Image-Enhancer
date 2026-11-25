import { ArrowRight, FileText, GitCompare, Upload, Workflow } from 'lucide-react';
import { Link } from 'react-router';
import { Reveal, Stagger, StaggerItem } from '../motion/Reveal.jsx';

const STEPS = [
  { icon: Upload, title: 'Upload & analyse', text: 'Originals are fingerprinted (SHA-256) and stored read-only. Noise, blur and contrast are measured and a pipeline is recommended, with reasons.', to: '/enhance', cta: 'Open workspace' },
  { icon: Workflow, title: 'Build pipelines', text: 'Combine denoising, deblurring, super-resolution and contrast steps with pretrained AI models or classical methods.', to: '/models', cta: 'Browse models' },
  { icon: GitCompare, title: 'Compare & measure', text: 'Inspect results with synchronised zoom, slider and difference maps, scored with PSNR/SSIM and no-reference metrics.', to: '/compare', cta: 'Compare results' },
  { icon: FileText, title: 'Report & reproduce', text: 'Every run records models, weights hashes and parameters. Export PDF reports for your lab notebook.', to: '/history', cta: 'View history' },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-[1440px] scroll-mt-24 px-4 py-16 sm:px-6">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold tracking-wide text-brand-400 uppercase">How it works</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">From raw micrograph to reproducible result</h2>
      </Reveal>
      <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, text, to, cta }, i) => (
          <StaggerItem key={title} className="glass card-interactive flex flex-col p-6">
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-400/10 text-brand-400"><Icon className="size-5" aria-hidden /></span>
              <span className="font-mono text-sm text-slate-500">0{i + 1}</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{text}</p>
            <Link to={to} className="group mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-300">
              {cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
