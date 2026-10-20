import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

export function Card({ className, children }: { className?: string; children: ReactNode }): JSX.Element {
  return (
    <div className={cn('bg-panel border border-line rounded-xl shadow-card', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-line">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }): JSX.Element {
  return <div className={cn('p-5', className)}>{children}</div>;
}
