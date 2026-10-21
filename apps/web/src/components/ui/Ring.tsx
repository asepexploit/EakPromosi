import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

interface RingProps {
  /** 0..100 */
  value: number;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'tg' | 'ok' | 'warn' | 'bad' | 'violet';
  children?: ReactNode;
  className?: string;
}

const SIZE: Record<NonNullable<RingProps['size']>, string> = {
  sm: 'w-9 h-9 text-[11px]',
  md: 'w-11 h-11 text-xs',
  lg: 'w-[120px] h-[120px] text-[22px] tracking-tight',
};

const INSET: Record<NonNullable<RingProps['size']>, string> = {
  sm: 'inset-[3px]',
  md: 'inset-[4px]',
  lg: 'inset-[10px]',
};

const TONE: Record<NonNullable<RingProps['tone']>, string> = {
  tg: 'rgb(var(--tg))',
  ok: 'rgb(var(--ok))',
  warn: 'rgb(var(--warn))',
  bad: 'rgb(var(--bad))',
  violet: 'rgb(var(--violet))',
};

export function Ring({ value, size = 'md', tone = 'tg', children, className }: RingProps): JSX.Element {
  const pct = Math.max(0, Math.min(100, value));
  const color = TONE[tone];
  return (
    <div
      className={cn('relative grid place-items-center rounded-full flex-none', SIZE[size], className)}
      style={{ background: `conic-gradient(${color} ${pct}%, rgb(var(--fg) / 0.08) 0)` }}
    >
      <span className={cn('absolute rounded-full bg-panel', INSET[size])} />
      <span className="relative font-bold tabular">{children ?? `${Math.round(pct)}%`}</span>
    </div>
  );
}
