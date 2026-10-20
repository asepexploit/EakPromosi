import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/cn';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  count?: number;
  icon?: ReactNode;
}

export function Chip({ active, count, icon, children, className, ...props }: ChipProps): JSX.Element {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 h-7 px-3 rounded-full border text-[12.5px] font-semibold whitespace-nowrap transition-all duration-150 ease-snap',
        active
          ? 'bg-tg/10 border-tg/55 text-tg-ink'
          : 'bg-panel border-line text-muted hover:text-fg hover:border-fg/20',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      {typeof count === 'number' ? (
        <span className="h-[18px] min-w-[18px] px-1.5 rounded-full bg-fg/[0.08] text-[10.5px] font-semibold text-muted grid place-items-center">
          {count}
        </span>
      ) : null}
    </button>
  );
}
