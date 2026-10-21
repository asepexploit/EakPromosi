import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE: Record<NonNullable<DialogProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Dialog({ open, onOpenChange, title, description, children, footer, size = 'md' }: DialogProps): JSX.Element {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-fg/50 z-40" />
        <RadixDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] bg-panel rounded-xl shadow-pop border border-line z-50',
            'max-h-[calc(100vh-2rem)] flex flex-col',
            SIZE[size],
          )}
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5">
            <div className="min-w-0">
              <RadixDialog.Title className="text-base font-semibold tracking-tight leading-tight">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="text-xs text-muted mt-1">{description}</RadixDialog.Description>
              ) : null}
            </div>
            <RadixDialog.Close className="text-muted hover:text-fg transition-colors mt-0.5 -mr-1" aria-label="Tutup">
              <X size={16} />
            </RadixDialog.Close>
          </div>
          <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">{children}</div>
          {footer ? <div className="px-5 py-3 border-t border-line flex items-center justify-end gap-2">{footer}</div> : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
