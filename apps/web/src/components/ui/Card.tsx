import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

interface CardProps {
  className?: string;
  interactive?: boolean;
  children: ReactNode;
}

export function Card({ className, interactive, children }: CardProps): JSX.Element {
  return (
    <div
      className={cn(
        'bg-panel border border-line rounded-lg shadow-card min-w-0 relative',
        interactive && 'transition-all duration-200 ease-snap hover:border-tg/30 hover:shadow-soft',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, actions, icon, className }: CardHeaderProps): JSX.Element {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="min-w-0 flex items-start gap-3">
        {icon ? (
          <div className="w-8 h-8 rounded-lg bg-tg/10 text-tg-ink grid place-items-center flex-none mt-0.5">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-[14.5px] font-semibold tracking-tight flex items-center gap-2 leading-tight">{title}</h3>
          {subtitle ? <p className="text-xs text-muted mt-1">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2 flex-wrap">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }): JSX.Element {
  return <div className={cn('px-5 pb-5 pt-4', className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: ReactNode }): JSX.Element {
  return (
    <div className={cn('px-5 py-3 border-t border-line flex items-center justify-between gap-2.5', className)}>
      {children}
    </div>
  );
}
