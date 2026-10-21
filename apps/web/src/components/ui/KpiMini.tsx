import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

/** Three small stat tiles stacked under a KPI (matches prototype's `.tb-mini3`). */
export function KpiMini3({
  items,
  className,
}: {
  items: ReadonlyArray<{ label: string; value: ReactNode; tone?: 'ok' | 'warn' | 'bad' | 'muted' }>;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('mt-3 grid grid-cols-3 gap-px rounded-lg overflow-hidden bg-line/80', className)}>
      {items.map((it, idx) => (
        <div key={`${idx}-${it.label}`} className="bg-sunk/70 px-2 py-2 min-w-0">
          <div
            className={cn(
              'text-[11px] font-medium text-muted truncate',
            )}
          >
            {it.label}
          </div>
          <div
            className={cn(
              'mt-0.5 font-semibold text-[13px] tabular tracking-tight truncate',
              it.tone === 'ok' && 'text-ok',
              it.tone === 'warn' && 'text-warn',
              it.tone === 'bad' && 'text-bad',
              !it.tone && 'text-fg',
              it.tone === 'muted' && 'text-muted',
            )}
          >
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}
