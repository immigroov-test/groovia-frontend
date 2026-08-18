'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

/** City picker scoped to a country, so "Coimbatore" cannot be chosen for the Netherlands (BUG-004).
 *
 * The city list is loaded with a dynamic import: the dataset covers every country and is several MB,
 * which has no business in the initial bundle when most visitors never open this form.
 *
 * "My city isn't listed" is deliberate rather than a fallback that happens by accident. A mentor from
 * a village too small for the dataset is never blocked, but landing on the wrong country's city now
 * takes scrolling past every real one and actively choosing to type it instead.
 *
 * The saved value is the plain city name, exactly as the free-text input produced before, so nothing
 * downstream (validation, profile, admin) has to change.
 */
export function CitySelect({
  label = 'City',
  countryCode,
  value,
  onChange,
  error,
  hint,
}: {
  label?: string;
  /** ISO-2 country code. No country means no list, so the field stays disabled. */
  countryCode: string;
  value: string;
  onChange: (city: string) => void;
  error?: string;
  hint?: string;
}) {
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Load this country's cities. Cancelled on change so a slow load for a country the mentor has
  // already moved away from cannot overwrite the newer list.
  useEffect(() => {
    if (!countryCode) {
      setCities([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { City } = await import('country-state-city');
        if (cancelled) return;
        const list = (City.getCitiesOfCountry(countryCode) ?? [])
          .map((c) => c.name)
          .filter((n, i, a) => a.indexOf(n) === i)
          .sort((a, b) => a.localeCompare(b));
        setCities(list);
      } catch {
        // A failed load must not trap the mentor: fall back to typing it.
        setCities([]);
        setCustom(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [countryCode]);

  // Changing country invalidates the chosen city: Amsterdam is not in India.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    onChange('');
    setQuery('');
    setCustom(false);
    // onChange is a new closure each render; depending on it would clear the field constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? cities.filter((c) => c.toLowerCase().includes(q)) : cities;
    return base.slice(0, 50);   // long lists are unusable and slow to render; typing narrows them
  }, [cities, query]);

  const disabled = !countryCode;

  if (custom) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-brand-900">{label}</label>
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your city"
            autoComplete="address-level2"
            className="w-full h-11 rounded-lg border border-[--color-border] bg-white px-3 pr-9 text-sm outline-none focus:border-brand-500"
          />
          <button
            type="button"
            onClick={() => { setCustom(false); onChange(''); setQuery(''); }}
            aria-label="Choose from the list instead"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-brand-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted">
          Not in the list, so we&apos;ll use what you type.{' '}
          <button type="button" onClick={() => { setCustom(false); onChange(''); }}
            className="text-brand-700 hover:underline">Choose from the list instead</button>
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5" ref={boxRef}>
      <label className="text-sm font-medium text-brand-900">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={open ? query : value}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (!disabled) { setQuery(''); setOpen(true); } }}
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
          disabled={disabled}
          placeholder={disabled ? 'Select a country first' : loading ? 'Loading cities…' : 'Start typing your city'}
          autoComplete="off"
          className="w-full h-11 rounded-lg border border-[--color-border] bg-white px-3 pr-9 text-sm outline-none focus:border-brand-500 disabled:bg-black/5 disabled:text-muted"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />

        {open && !disabled && (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[--color-border] bg-white shadow-lg">
            {matches.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { onChange(c); setOpen(false); setQuery(''); }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
              >
                {c}
              </button>
            ))}
            {!loading && matches.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted">No match in this country.</p>
            )}
            <button
              type="button"
              onClick={() => { setCustom(true); setOpen(false); onChange(''); }}
              className="block w-full border-t border-[--color-border] px-3 py-2 text-left text-sm font-medium text-brand-700 hover:bg-brand-50"
            >
              My city isn&apos;t listed
            </button>
          </div>
        )}
      </div>
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
