import { cn } from '../../lib/cn';

export interface HBarItem {
  label: string;
  value: number;
  color?: string;
}

interface HorizontalBarProps {
  items: ReadonlyArray<HBarItem>;
  /** Max for scaling the track width. Defaults to the max of values. */
  max?: number;
  format?: (v: number) => string;
  className?: string;
}

const defaultFmt = (n: number): string => new Intl.NumberFormat('id-ID').format(Math.round(n));

/** Row-per-item horizontal bars (mocks the prototype's `.tb-hbar`). */
export function HorizontalBar({ items, max, format = defaultFmt, className }: HorizontalBarProps): JSX.Element {
  const peak = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {items.map((it, idx) => {
        const pct = Math.max(0, Math.min(100, (it.value / peak) * 100));
        return (
          <div key={`${idx}-${it.label}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 items-center">
            <span className="text-[12.5px] truncate">{it.label}</span>
            <span className="text-[12.5px] font-semibold tabular text-right">
              {format(it.value)}{' '}
              <span className="text-muted font-medium">
                {Math.round((it.value / peak) * 100)}%
              </span>
            </span>
            <div className="col-span-2 h-2 rounded-full bg-fg/[0.08] overflow-hidden mb-2.5">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-snap"
                style={{ width: `${pct}%`, background: it.color ?? 'rgb(var(--tg))' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
