import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  disabled?: boolean;
}

/** Thin wrapper around Radix Tooltip with the design-system dark bubble. */
export function Tooltip({ content, children, side = 'top', className, disabled }: TooltipProps): JSX.Element {
  if (disabled) return <>{children}</>;
  return (
    <RadixTooltip.Provider delayDuration={160}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={6}
            className={cn(
              'z-50 px-2 py-1 rounded-md bg-[#0E1621] text-[#E8EEF5] text-[11.5px] font-medium shadow-pop pointer-events-none',
              'data-[state=delayed-open]:animate-fade-up',
              className,
            )}
          >
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
