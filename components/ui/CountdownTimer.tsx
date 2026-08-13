'use client';
import { useEffect, useState } from 'react';

// A countdown ring with the remaining seconds in the middle. Kept generic and separate from the
// overlay that currently uses it, so the next thing that needs a visible wait (a payment hold
// expiring, a reschedule offer running out) reuses this instead of growing its own.
export interface CountdownTimerProps {
  /** Seconds to count down from. */
  seconds: number;
  /** Fires once when it reaches zero. The timer then holds at 0 rather than going negative. */
  onDone?: () => void;
  /** Pixel diameter. */
  size?: number;
  label?: string;
}

export function CountdownTimer({ seconds, onDone, size = 96, label }: CountdownTimerProps) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => { setLeft(seconds); }, [seconds]);

  useEffect(() => {
    if (left <= 0) { onDone?.(); return; }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
    // onDone deliberately excluded: an inline arrow from the parent would restart the tick each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const pct = seconds > 0 ? Math.max(0, left) / seconds : 0;

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="5" fill="none" className="stroke-brand-100" />
          <circle
            cx={size / 2} cy={size / 2} r={r} strokeWidth="5" fill="none" strokeLinecap="round"
            className="stroke-brand-600 transition-[stroke-dashoffset] duration-1000 ease-linear"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-semibold tabular-nums text-brand-900">{Math.max(0, left)}s</span>
        </div>
      </div>
      {label && <span className="text-xs text-muted">{label}</span>}
    </div>
  );
}
