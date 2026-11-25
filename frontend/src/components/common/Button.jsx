import { LoaderCircle } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-brand-600 text-on-brand shadow-sm shadow-brand-600/25 hover:bg-brand-500 hover:shadow-md hover:shadow-brand-600/30',
  secondary: 'border border-line bg-ink-900/70 text-slate-100 hover:border-brand-400/40 hover:bg-ink-800',
  ghost: 'text-slate-300 hover:bg-white/5 hover:text-white',
  danger: 'border border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
};

const SIZES = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-6 text-base',
};

/** Button / link with hover, press and loading feedback. `as="a"` renders a link. */
export function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}) {
  const isDisabled = disabled || loading;
  return (
    <Component
      className={`group/btn inline-flex items-center justify-center rounded-xl font-semibold whitespace-nowrap transition-all duration-200 ease-out
        select-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:active:scale-100
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={Component === 'button' ? isDisabled : undefined}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      {...(Component === 'button' && !props.type ? { type: 'button' } : {})}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : Icon && <Icon className="size-4" />}
      {children}
      {IconRight && <IconRight className="size-4 transition-transform duration-200 group-hover/btn:translate-x-0.5" />}
    </Component>
  );
}
