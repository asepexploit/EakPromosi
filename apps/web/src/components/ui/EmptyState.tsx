import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="text-center py-10 px-5 flex flex-col items-center gap-1.5">
      {icon ? (
        <div className="w-14 h-14 rounded-xl grid place-items-center bg-tg/5 text-tg-ink border border-dashed border-tg/40 mb-2">
          {icon}
        </div>
      ) : null}
      <h4 className="text-sm font-semibold">{title}</h4>
      {description ? <p className="text-sm text-muted max-w-[40ch]">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
