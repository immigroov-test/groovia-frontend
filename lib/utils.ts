import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes safely. Standard helper used by every component.
 * Example: cn('px-4 py-2', isActive && 'bg-brand-500', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * "2 hours" / "1 hour" / "1.5 hours" - formats a mentor's own configured notice window (BUG-119),
 * so copy never hardcodes a fixed number that could contradict what they actually set.
 */
export function hoursText(h: number): string {
  const n = Math.round(h * 10) / 10;
  return `${n % 1 === 0 ? n : n.toFixed(1)} ${n === 1 ? 'hour' : 'hours'}`;
}
