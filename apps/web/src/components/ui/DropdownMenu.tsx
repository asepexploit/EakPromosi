import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function DropdownMenu({ trigger, children, align = 'end', className }: DropdownMenuProps): JSX.Element {
  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild>{trigger}</RadixDropdown.Trigger>
      <RadixDropdown.Portal>
        <RadixDropdown.Content
          align={align}
          sideOffset={6}
          className={cn(
            'min-w-[200px] max-w-[360px] p-1.5 bg-panel border border-line rounded-xl shadow-pop',
            'data-[state=open]:animate-fade-up z-50',
            className,
          )}
        >
          {children}
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  );
}

interface MenuItemProps {
  icon?: ReactNode;
  children: ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function MenuItem({ icon, children, onSelect, danger, disabled }: MenuItemProps): JSX.Element {
  return (
    <RadixDropdown.Item
      disabled={disabled ?? false}
      {...(onSelect ? { onSelect } : {})}
      className={cn(
        'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[13px] cursor-pointer outline-none',
        'hover:bg-fg/5 focus:bg-fg/5 transition-colors',
        'data-[disabled]:opacity-45 data-[disabled]:cursor-not-allowed',
        danger ? 'text-bad [&_svg]:text-bad' : 'text-fg [&_svg]:text-muted',
      )}
    >
      {icon}
      <span className="flex-1">{children}</span>
    </RadixDropdown.Item>
  );
}

export function MenuSeparator(): JSX.Element {
  return <RadixDropdown.Separator className="h-px bg-line my-1 mx-1" />;
}

export function MenuLabel({ children }: { children: ReactNode }): JSX.Element {
  return (
    <RadixDropdown.Label className="px-2.5 pt-2 pb-1.5 text-[11px] uppercase tracking-[0.06em] text-muted font-semibold">
      {children}
    </RadixDropdown.Label>
  );
}
