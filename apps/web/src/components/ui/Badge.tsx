import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

export type BadgeTone = 'default' | 'ok' | 'warn' | 'bad' | 'info';

const toneStyles: Record<BadgeTone, string> = {
  default: 'bg-sunk text-fg',
  ok: 'bg-ok/10 text-ok border border-ok/20',
  warn: 'bg-warn/10 text-warn border border-warn/20',
  bad: 'bg-bad/10 text-bad border border-bad/20',
  info: 'bg-tg/10 text-tg-deep border border-tg/20',
};

export function Badge({ tone = 'default', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }): JSX.Element {
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', toneStyles[tone], className)}>
      {children}
    </span>
  );
}
