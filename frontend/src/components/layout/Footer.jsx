import { Microscope } from 'lucide-react';
import { Link } from 'react-router';

const LINKS = [
  { to: '/models', label: 'Models' },
  { to: '/history', label: 'History' },
  { to: '/projects', label: 'Projects' },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-ink-900/50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-6 text-xs text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p className="flex items-center gap-2">
          <Microscope className="size-4 text-brand-500" aria-hidden />
          © {new Date().getFullYear()} LabClarity AI · For research use only.
        </p>
        <nav className="flex gap-4" aria-label="Footer">
          {LINKS.map((l) => <Link key={l.to} to={l.to} className="transition-colors hover:text-brand-300">{l.label}</Link>)}
        </nav>
        <p className="max-w-md md:text-right">
          AI output may contain hallucinated structures. Always validate against the original data before drawing scientific conclusions.
        </p>
      </div>
    </footer>
  );
}
