import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

export type BadgeTone = 'default' | 'ok' | 'warn' | 'bad' | 'info' | 'violet';

const toneStyles: Record<BadgeTone, string> = {
  default: 'bg-fg/[0.08] text-muted',
  ok: 'bg-ok/10 text-ok',
  warn: 'bg-warn/10 text-warn',
  bad: 'bg-bad/10 text-bad',
  info: 'bg-tg/10 text-tg-ink',
  violet: 'bg-violet/10 text-violet',
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

export function Badge({ tone = 'default', dot = true, pulse = false, children, className }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 h-[22px] px-2.5 pl-2 rounded-full text-[11.5px] font-semibold whitespace-nowrap',
        toneStyles[tone],
        className,
      )}
    >
      {dot ? (
        <span
          className={cn('w-1.5 h-1.5 rounded-full flex-none', `bg-current`, pulse && 'animate-pulse-ring')}
        />
      ) : null}
      {children}
    </span>
  );
}
