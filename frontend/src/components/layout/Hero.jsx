import { Layers, ShieldCheck, Sparkles } from 'lucide-react';

const HIGHLIGHTS = [
  { icon: Sparkles, text: 'Real-ESRGAN & SwinIR' },
  { icon: Layers, text: '8/16-bit TIFF, PNG, JPEG' },
  { icon: ShieldCheck, text: 'Files auto-deleted after 24h' },
];

export function Hero() {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-12 pb-8 text-center sm:pt-16">
      <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-400/5 px-3 py-1 text-xs font-medium text-brand-300">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-brand-400" />
        </span>
        AI super-resolution for microscopy
      </span>
      <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance text-white sm:text-5xl">
        Reveal the detail hidden in <span className="text-gradient">every micrograph</span>
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base text-pretty text-slate-400">
        Upscale and restore microscopy images with pretrained deep-learning models, then compare
        original and enhanced side by side, down to the pixel.
      </p>
      <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
        {HIGHLIGHTS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-1.5">
            <Icon className="size-3.5 text-brand-400" aria-hidden />
            {text}
          </li>
        ))}
      </ul>
    </section>
  );
}
