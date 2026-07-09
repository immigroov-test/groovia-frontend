'use client';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

// Normalize the runtime offset ("GMT+5:30" / "GMT-7" / "GMT") to "GMT+05:30".
function offsetLabel(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
    const raw = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
    const m = raw.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return 'GMT+00:00';
    return `GMT${m[1]}${m[2].padStart(2, '0')}:${m[3] ?? '00'}`;
  } catch {
    return 'GMT+00:00';
  }
}

function offsetMinutes(label: string): number {
  const m = label.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
}

interface TzOption { tz: string; offset: string; label: string }

// Built once. Sorted by offset so the list reads from GMT-12 to GMT+14.
const TZ_OPTIONS: TzOption[] = Intl.supportedValuesOf('timeZone')
  .map((tz) => {
    const offset = offsetLabel(tz);
    return { tz, offset, label: `(${offset}) ${tz.replace(/_/g, ' ')}` };
  })
  .sort((a, b) => offsetMinutes(a.offset) - offsetMinutes(b.offset) || a.tz.localeCompare(b.tz));

interface Props {
  value: string;
  onChange: (tz: string) => void;
  label?: string;
  hint?: string;
}

export function TimezoneSelect({ value, onChange, label, hint }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = query
    ? TZ_OPTIONS.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : TZ_OPTIONS;

  const selected = TZ_OPTIONS.find((o) => o.tz === value);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    if (open) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    (listRef.current.children[highlight] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  function select(tz: string) {
    onChange(tz);
    setOpen(false);
    setQuery('');
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlight]) select(filtered[highlight].tz); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  }

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}

      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setHighlight(0); }}
        className={cn(
          'flex items-center gap-2 h-10 px-3 rounded-lg bg-white text-sm text-left',
          'shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]',
          'hover:shadow-[0_0_0_1px_rgba(15,23,42,0.12)] focus:outline-none',
          open && 'shadow-[0_0_0_2px_rgba(29,78,216,0.25)]',
        )}
      >
        <span className="flex-1 text-foreground truncate">{selected ? selected.label : 'Select timezone'}</span>
        <svg className="h-3.5 w-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={open ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-w-sm bg-white rounded-xl border border-[--color-border] shadow-xl overflow-hidden" style={{ position: 'relative' }}>
          <div className="p-2 border-b border-[--color-border]">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
              onKeyDown={onKeyDown}
              placeholder="Search city or GMT offset"
              className="w-full px-2 py-1.5 text-sm rounded-lg bg-brand-50 focus:outline-none placeholder:text-muted"
            />
          </div>
          <ul ref={listRef} className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-2 text-sm text-muted">No results</li>}
            {filtered.map((o, i) => (
              <li
                key={o.tz}
                onClick={() => select(o.tz)}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  'px-3 py-2 text-sm cursor-pointer text-foreground',
                  i === highlight && 'bg-brand-50',
                  o.tz === value && 'font-medium text-brand-700',
                )}
              >
                {o.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
