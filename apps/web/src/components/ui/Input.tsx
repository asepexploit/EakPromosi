import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-lg border border-line bg-bg px-3 text-[13.5px] placeholder:text-muted/75 outline-none transition-all duration-150 ease-snap',
        'focus:border-tg focus:shadow-focus-tg',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

interface InputWithIconProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: ReactNode;
  wrapClassName?: string;
}

export const InputWithIcon = forwardRef<HTMLInputElement, InputWithIconProps>(
  ({ icon, wrapClassName, className, ...props }, ref) => (
    <div className={cn('relative', wrapClassName)}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">{icon}</span>
      <input
        ref={ref}
        className={cn(
          'h-9 w-full rounded-lg border border-line bg-bg pl-9 pr-3 text-[13.5px] placeholder:text-muted/75 outline-none transition-all duration-150 ease-snap',
          'focus:border-tg focus:shadow-focus-tg',
          className,
        )}
        {...props}
      />
    </div>
  ),
);
InputWithIcon.displayName = 'InputWithIcon';

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps): JSX.Element {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-xs font-semibold">{label}</span>
      {children}
      {error ? <span className="text-xs text-bad">{error}</span> : hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
