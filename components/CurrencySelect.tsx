'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Flag } from './ui/Flag';
import { CURRENCIES } from '../lib/pricing';

// A currency picker with colourful SVG flags + the full currency name, properly aligned (a native
// <select> can't hold images, and flag emoji don't render on Windows). Flag sits in a fixed-width
// column so every name lines up. `options` optionally restricts the list to specific currency codes.
export function CurrencySelect({ value, onChange, options, className = '' }: {
  value: string;
  onChange: (code: string) => void;
  options?: string[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const codes = options ?? CURRENCIES.map((c) => c.code);
  const items = codes.map((code) => CURRENCIES.find((c) => c.code === code)).filter(Boolean) as typeof CURRENCIES;
  const sel = CURRENCIES.find((c) => c.code === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}
        className="h-11 w-full pl-3 pr-2 rounded-xl bg-white text-sm flex items-center gap-2 shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]">
        {sel && <Flag code={sel.country} className="w-5 h-auto rounded-[2px] shrink-0" />}
        <span className="flex-1 min-w-0 text-left truncate text-foreground">{sel?.name ?? value}</span>
        <ChevronDown className="h-4 w-4 text-muted shrink-0" />
      </button>
      {open && (
        <ul role="listbox" tabIndex={-1}
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl bg-white py-1 shadow-[0_8px_28px_rgba(15,23,42,0.16),0_0_0_1px_rgba(15,23,42,0.08)]">
          {items.map((c) => (
            <li key={c.code} role="option" aria-selected={c.code === value}
              onClick={() => { onChange(c.code); setOpen(false); }}
              className={`px-3 py-2 flex items-center gap-2.5 cursor-pointer text-sm hover:bg-brand-50 ${c.code === value ? 'bg-brand-50/60 font-medium' : ''}`}>
              <Flag code={c.country} className="w-5 h-auto rounded-[2px] shrink-0" />
              <span className="flex-1 min-w-0 truncate text-foreground">{c.name}</span>
              <span className="text-xs text-muted shrink-0">{c.code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
