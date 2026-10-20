import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

export function Table({ children, className }: { children: ReactNode; className?: string }): JSX.Element {
  return (
    <div className={cn('overflow-x-auto scrollbar-thin', className)}>
      <table className="w-full border-separate border-spacing-0 text-[13px]">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }): JSX.Element {
  return (
    <thead className="[&_th]:text-left [&_th]:font-semibold [&_th]:text-[11.5px] [&_th]:text-muted [&_th]:uppercase [&_th]:tracking-[0.05em] [&_th]:px-4 [&_th]:py-2.5 [&_th]:border-b [&_th]:border-line [&_th]:bg-panel [&_th]:whitespace-nowrap [&_th]:sticky [&_th]:top-0 [&_th.r]:text-right">
      {children}
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }): JSX.Element {
  return (
    <tbody className="[&_tr]:transition-colors [&_tr:hover]:bg-fg/[0.03] [&_td]:px-4 [&_td]:py-3 [&_td]:border-b [&_td]:border-line-soft/60 [&_td]:align-middle [&_tr:last-child_td]:border-b-0 [&_td.r]:text-right [&_td.mono]:font-mono [&_td.mono]:text-xs">
      {children}
    </tbody>
  );
}

export function TMain({ children }: { children: ReactNode }): JSX.Element {
  return <span className="font-semibold tracking-tight">{children}</span>;
}

export function TSub({ children }: { children: ReactNode }): JSX.Element {
  return <div className="text-xs text-muted">{children}</div>;
}
