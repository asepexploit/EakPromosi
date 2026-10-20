import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none transition-all duration-150 ease-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tg focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:pointer-events-none active:translate-y-px',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-b from-[rgb(52_180_244)] to-tg-deep text-white border border-tg-deep shadow-tg hover:brightness-110',
        secondary: 'bg-panel border border-line text-fg hover:bg-sunk shadow-card',
        ghost: 'bg-transparent text-fg hover:bg-fg/[0.045]',
        outline: 'border border-line bg-panel text-fg hover:bg-sunk shadow-card',
        danger: 'bg-panel border border-line text-bad hover:bg-bad/10 hover:border-bad/40 shadow-card',
        'danger-solid': 'bg-bad text-white border border-transparent hover:brightness-110 shadow-card',
        warn: 'bg-panel border border-line text-warn hover:bg-warn/10 shadow-card',
      },
      size: {
        xs: 'h-7 px-2.5 text-xs rounded-md gap-1.5',
        sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
        md: 'h-9 px-3.5 text-[13px] rounded-lg',
        lg: 'h-10 px-4 text-sm rounded-lg',
      },
      iconOnly: {
        true: 'px-0',
        false: '',
      },
    },
    compoundVariants: [
      { iconOnly: true, size: 'xs', class: 'w-7' },
      { iconOnly: true, size: 'sm', class: 'w-8' },
      { iconOnly: true, size: 'md', class: 'w-9' },
      { iconOnly: true, size: 'lg', class: 'w-10' },
    ],
    defaultVariants: { variant: 'secondary', size: 'md', iconOnly: false },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonStyles> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, iconOnly, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonStyles({ variant, size, iconOnly }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : null}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
