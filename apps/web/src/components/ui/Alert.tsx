import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

type AlertTone = 'info' | 'warn' | 'bad';

const toneStyles: Record<AlertTone, { border: string; bg: string; iconBg: string; Icon: typeof Info }> = {
  info: { border: 'border-tg/40', bg: 'bg-tg/[0.06]', iconBg: 'bg-tg/10 text-tg-ink', Icon: Info },
  warn: { border: 'border-warn/40', bg: 'bg-warn/[0.07]', iconBg: 'bg-warn/10 text-warn', Icon: AlertTriangle },
  bad: { border: 'border-bad/35', bg: 'bg-bad/[0.05]', iconBg: 'bg-bad/10 text-bad', Icon: AlertCircle },
};

interface AlertProps {
  tone?: AlertTone;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function Alert({ tone = 'info', title, description, actions, className }: AlertProps): JSX.Element {
  const { border, bg, iconBg, Icon } = toneStyles[tone];
  return (
    <div className={cn('flex items-center gap-3 px-3.5 py-3 rounded-xl border text-sm', border, bg, className)}>
      <div className={cn('w-8 h-8 rounded-lg grid place-items-center flex-none', iconBg)}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{title}</p>
        {description ? <p className="text-xs text-muted mt-0.5">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}
