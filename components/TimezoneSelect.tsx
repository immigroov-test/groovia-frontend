'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { tzCity, tzOffset } from '../lib/timezone';

// BUG-125 / BUG-126: the booking flow used to assume the browser clock WAS the customer's timezone,
// with no way to say otherwise. That reads wrong for anyone booking from a different zone than their
// device is set to (travelling, a work laptop on another zone, a VPN), and the zone we captured was
// also what went into the confirmation email and the mentor's calendar. Every booking tool worth
// copying (Calendly, Cal.com) shows the zone up front and lets you change it, so we do the same: the
// browser zone is the default, and this picker is the escape hatch.

// Every IANA zone the runtime knows. Modern browsers support this; older ones fall back to a short
// list built from the zones we already ship for country lookups.
function allZones(): string[] {
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
      .supportedValuesOf?.('timeZone');
    if (supported?.length) return supported;
  } catch { /* fall through */ }
  return [Intl.DateTimeFormat().resolvedOptions().timeZone];
}

// Sort by current UTC offset so the list reads like a world clock rather than an alphabet soup.
function offsetMinutes(tz: string): number {
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(tzOffset(tz));
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3] ?? '0', 10));
}

export function TimezoneSelect({ value, onChange, className = '' }: {
  value: string;
  onChange: (tz: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const zones = useMemo(() => {
    const list = allZones();
    if (value && !list.includes(value)) list.push(value);
    return list.sort((a, b) => offsetMinutes(a) - offsetMinutes(b) || a.localeCompare(b));
  }, [value]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return zones;
    return zones.filter((z) => z.toLowerCase().includes(q) || tzOffset(z).toLowerCase().includes(q));
  }, [zones, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button type="button" onClick={() => { setOpen((o) => !o); setQuery(''); }}
        aria-haspopup="listbox" aria-expanded={open} aria-label="Change your timezone"
        className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-brand-700 underline decoration-dotted underline-offset-4">
        {tzCity(value)} ({tzOffset(value)})
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-72 max-w-[80vw] rounded-xl bg-white shadow-[0_8px_28px_rgba(15,23,42,0.16),0_0_0_1px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[--color-border]">
            <Search className="h-4 w-4 text-muted shrink-0" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city or GMT offset"
              className="w-full bg-transparent text-sm focus:outline-none placeholder:text-muted" />
          </div>
          <ul role="listbox" className="max-h-64 overflow-auto py-1">
            {shown.length === 0 && <li className="px-3 py-2 text-sm text-muted">No match</li>}
            {shown.map((z) => (
              <li key={z} role="option" aria-selected={z === value}
                onClick={() => { onChange(z); setOpen(false); }}
                className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer text-sm hover:bg-brand-50 ${z === value ? 'bg-brand-50/60 font-medium' : ''}`}>
                <span className="min-w-0 truncate text-foreground">{z.replace(/_/g, ' ')}</span>
                <span className="text-xs text-muted shrink-0">{tzOffset(z)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
