import { cn } from '../../lib/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}

export function Switch({ checked, onChange, disabled, ...a11y }: SwitchProps): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-[38px] h-[22px] rounded-full flex-none transition-colors duration-200 ease-snap outline-none focus-visible:ring-2 focus-visible:ring-tg focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50',
        checked ? 'bg-tg' : 'bg-muted/35',
      )}
      {...a11y}
    >
      <span
        className={cn(
          'absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ease-snap',
          checked ? 'translate-x-[19px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  );
}
