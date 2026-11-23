import { LoaderCircle } from 'lucide-react';

const VARIANTS = {
  primary:
    'bg-gradient-to-r from-brand-400 to-accent-500 text-ink-950 shadow-lg shadow-brand-500/25 hover:shadow-brand-400/40 hover:brightness-110',
  secondary: 'border border-line bg-white/5 text-slate-100 hover:bg-white/10',
  ghost: 'text-slate-300 hover:bg-white/5 hover:text-white',
  danger: 'border border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
};

const SIZES = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-6 text-base',
};

export function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}) {
  const isDisabled = disabled || loading;
  return (
    <Component
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200
        disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:brightness-100
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={Component === 'button' ? isDisabled : undefined}
      aria-disabled={isDisabled || undefined}
      {...(Component === 'button' && !props.type ? { type: 'button' } : {})}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : Icon && <Icon className="size-4" />}
      {children}
    </Component>
  );
}
