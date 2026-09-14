import { useId } from 'react';

// Groovia's avatar: a flat, hand-drawn robot in the brand colours. A robot rather than a human face,
// so nobody mistakes the assistant for a person. Inline SVG, so it never breaks and stays sharp.
export function AiAvatar({ className = 'h-8 w-8', online = false, blink = false }: { className?: string; online?: boolean; blink?: boolean }) {
  const clip = useId();
  return (
    <span className={`${className} relative inline-flex shrink-0`}>
      <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden>
        <defs>
          <clipPath id={clip}><circle cx="24" cy="24" r="24" /></clipPath>
        </defs>
        <g clipPath={`url(#${clip})`}>
          <circle cx="24" cy="24" r="24" fill="var(--brand-100)" />
          <path d="M24 13.5V9" stroke="var(--brand-800)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="24" cy="7.5" r="2.6" fill="var(--accent-500)" />
          <rect x="8.5" y="21" width="3.5" height="9" rx="1.75" fill="var(--brand-800)" />
          <rect x="36" y="21" width="3.5" height="9" rx="1.75" fill="var(--brand-800)" />
          <path d="M14 50c0-6 4.5-9.5 10-9.5s10 3.5 10 9.5" fill="var(--brand-600)" />
          <rect x="11" y="13.5" width="26" height="23" rx="9" fill="var(--brand-800)" />
          <rect x="14.5" y="17.5" width="19" height="13" rx="6" fill="#fff" />
          <g className={blink ? 'avatar-blink' : undefined}>
            <ellipse cx="20.2" cy="23" rx="1.9" ry="2.3" fill="var(--brand-800)" />
            <ellipse cx="27.8" cy="23" rx="1.9" ry="2.3" fill="var(--brand-800)" />
          </g>
          <path d="M21.2 26.8c1.6 1.3 4 1.3 5.6 0" stroke="var(--accent-500)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </g>
      </svg>
      {online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" aria-hidden />
      )}
    </span>
  );
}
