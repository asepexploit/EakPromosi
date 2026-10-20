import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

export type KpiTone = 'tg' | 'ok' | 'warn' | 'bad' | 'violet' | 'muted';

const toneStyles: Record<KpiTone, string> = {
  tg: 'bg-tg/10 text-tg-ink',
  ok: 'bg-ok/10 text-ok',
  warn: 'bg-warn/10 text-warn',
  bad: 'bg-bad/10 text-bad',
  violet: 'bg-violet/10 text-violet',
  muted: 'bg-fg/[0.06] text-muted',
};

interface KpiProps {
  label: string;
  value: ReactNode;
  valueSuffix?: ReactNode;
  tone?: KpiTone;
  icon?: ReactNode;
  footer?: ReactNode;
  delta?: { direction: 'up' | 'down' | 'flat'; value: string };
  className?: string;
}

export function Kpi({ label, value, valueSuffix, tone = 'tg', icon, footer, delta, className }: KpiProps): JSX.Element {
  return (
    <div
      className={cn(
        'bg-panel border border-line rounded-lg shadow-card px-5 pt-4 pb-3.5 flex flex-col gap-1 overflow-hidden min-w-0',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12.5px] text-muted font-medium">{label}</p>
        {icon ? (
          <span className={cn('w-8 h-8 rounded-lg grid place-items-center', toneStyles[tone])}>{icon}</span>
        ) : null}
      </div>
      <p className="text-[28px] font-bold leading-tight tracking-tight tabular mt-1">
        {value}
        {valueSuffix ? <span className="text-sm font-medium text-muted tracking-normal ml-1">{valueSuffix}</span> : null}
      </p>
      <div className="min-h-[22px] flex items-center gap-2 text-xs text-muted">
        {delta ? <Delta direction={delta.direction} value={delta.value} /> : null}
        {footer}
      </div>
    </div>
  );
}

function Delta({ direction, value }: { direction: 'up' | 'down' | 'flat'; value: string }): JSX.Element {
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;
  const styles =
    direction === 'up'
      ? 'bg-ok/10 text-ok'
      : direction === 'down'
        ? 'bg-bad/10 text-bad'
        : 'bg-fg/[0.08] text-muted';
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-semibold text-[11.5px] px-1.5 py-0.5 rounded-full', styles)}>
      <Icon size={12} strokeWidth={2.4} />
      {value}
    </span>
  );
}
