import { Cpu, Microscope, Zap } from 'lucide-react';
import { Badge } from '../common/Badge.jsx';

function RuntimeStatus({ runtime, error, loading }) {
  if (loading) return <Badge>Connecting…</Badge>;
  if (error || !runtime) return <Badge tone="danger" dot>AI service offline</Badge>;
  const isGpu = runtime.device === 'cuda';
  const Icon = isGpu ? Zap : Cpu;
  return (
    <Badge tone={isGpu ? 'success' : 'brand'} className="gap-1.5">
      <Icon className="size-3" aria-hidden />
      <span className="hidden sm:inline">{isGpu ? runtime.gpu || 'GPU' : 'CPU inference'}</span>
      <span className="sm:hidden">{isGpu ? 'GPU' : 'CPU'}</span>
    </Badge>
  );
}

export function Header({ runtime, modelsError, modelsLoading }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a href="/" className="group flex items-center gap-2.5" aria-label="LabClarity AI home">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-accent-500 shadow-lg shadow-brand-500/30 transition-transform group-hover:scale-105">
            <Microscope className="size-5 text-ink-950" aria-hidden />
          </span>
          <span className="text-base font-semibold tracking-tight text-white">
            LabClarity <span className="text-gradient">AI</span>
          </span>
        </a>
        <RuntimeStatus runtime={runtime} error={modelsError} loading={modelsLoading} />
      </div>
    </header>
  );
}
