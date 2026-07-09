'use client';
import { cn } from '../../lib/utils';

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  'aria-label'?: string;
}

// A clean iOS-style switch. Reused for day on/off and service activate.
export function Toggle({ checked, onChange, disabled, size = 'md', ...rest }: Props) {
  const dims = size === 'sm'
    ? { track: 'h-5 w-9', knob: 'h-4 w-4', on: 'translate-x-4', off: 'translate-x-0.5' }
    : { track: 'h-6 w-11', knob: 'h-5 w-5', on: 'translate-x-5', off: 'translate-x-0.5' };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rest['aria-label']}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
        dims.track,
        checked ? 'bg-brand-600' : 'bg-neutral-300',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span className={cn('inline-block transform rounded-full bg-white shadow transition-transform', dims.knob, checked ? dims.on : dims.off)} />
    </button>
  );
}
