import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

interface TabsProps<T extends string> {
  tabs: ReadonlyArray<{ id: T; label: string; icon?: ReactNode; count?: number }>;
  value: T;
  onChange: (id: T) => void;
  className?: string;
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: TabsProps<T>): JSX.Element {
  return (
    <div className={cn('flex gap-1 border-b border-line overflow-x-auto scrollbar-thin', className)}>
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              'relative inline-flex items-center gap-2 px-3 py-2.5 text-[13.5px] font-semibold whitespace-nowrap transition-colors',
              active ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {t.icon}
            {t.label}
            {typeof t.count === 'number' ? (
              <span className="ml-1 text-[11px] font-semibold text-muted bg-fg/[0.08] rounded px-1.5 py-0.5">{t.count}</span>
            ) : null}
            {active ? (
              <span className="absolute left-2 right-2 bottom-[-1px] h-0.5 rounded bg-tg" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

interface SegGroupProps<T extends string> {
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
  className?: string;
}

export function SegGroup<T extends string>({ options, value, onChange, className }: SegGroupProps<T>): JSX.Element {
  return (
    <div className={cn('inline-flex border border-line rounded-lg p-0.5 bg-sunk gap-0.5', className)}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              'h-7 px-3 rounded-md text-xs font-semibold transition-all duration-150 ease-snap whitespace-nowrap',
              active ? 'bg-panel text-fg shadow-card ring-1 ring-line' : 'text-muted hover:text-fg',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
