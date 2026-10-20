import { cn } from '../../lib/cn';

interface ProgressProps {
  value: number; // 0..100
  tone?: 'tg' | 'ok' | 'warn' | 'bad' | 'muted';
  striped?: boolean;
  className?: string;
}

const toneBar: Record<NonNullable<ProgressProps['tone']>, string> = {
  tg: 'bg-gradient-to-r from-tg-glow to-tg-deep',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
  muted: 'bg-muted/60',
};

export function Progress({ value, tone = 'tg', striped, className }: ProgressProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('h-1.5 rounded-full bg-fg/[0.08] overflow-hidden relative', className)}>
      <div
        className={cn(
          'absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-snap',
          toneBar[tone],
          striped && 'animate-stripe bg-[length:14px_14px,100%_100%]',
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
