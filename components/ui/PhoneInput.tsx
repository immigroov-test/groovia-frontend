'use client';
import { useEffect, useRef, useState } from 'react';
import { isValidPhoneNumber, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import { PHONE_CODES } from '../../lib/phoneCodes';
import { Flag } from './Flag';
import { cn } from '../../lib/utils';

interface Props {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  required?: boolean;
  hint?: string;
  /** ISO-2 of where the person actually is, so the dial code starts on their country (BUG-125). */
  defaultCountry?: string | null;
}

export function PhoneInput({ value, onChange, label = 'Phone Number', required, hint, defaultCountry }: Props) {
  // BUG-125: this used to open on +31 for everyone, so a customer in India was pre-set to a Dutch dial
  // code. Start from the detected country instead; NL only remains as the last-resort fallback.
  const initial = PHONE_CODES.find((c) => c.code === (defaultCountry || '').toUpperCase());
  const [dialCode, setDialCode] = useState(initial?.dial ?? '+31');
  const [dialIso, setDialIso] = useState(initial?.code ?? 'NL');
  const [number, setNumber] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const initialized = useRef(false);

  // Initialize the picker + number from an incoming value once (e.g. a profile
  // phone prefilled at booking, or the mentor's saved phone on the edit form).
  // The stored form is "{dial} {national}"; parse it back into the two controls.
  useEffect(() => {
    if (initialized.current || !value) return;
    initialized.current = true;
    const parsed = parsePhoneNumberFromString(value);
    if (parsed) {
      setDialCode(`+${parsed.countryCallingCode}`);
      if (parsed.country) setDialIso(parsed.country);
      setNumber(parsed.nationalNumber);
      return;
    }
    const trimmed = value.trim();
    if (trimmed.startsWith('+')) {
      const [d, ...rest] = trimmed.split(' ');
      setDialCode(d);
      setNumber(rest.join(' '));
    } else {
      setNumber(trimmed);
    }
  }, [value]);

  // Geo detection resolves after mount, so adopt it once it lands - but only while the field is still
  // untouched and empty, so it can never overwrite a number the person already has or picked.
  const touched = useRef(false);
  useEffect(() => {
    if (touched.current || initialized.current || value) return;
    const c = PHONE_CODES.find((x) => x.code === (defaultCountry || '').toUpperCase());
    if (c) { setDialCode(c.dial); setDialIso(c.code); }
  }, [defaultCountry, value]);

  const filtered = filterQuery
    ? PHONE_CODES.filter(
        (c) =>
          c.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
          c.dial.includes(filterQuery),
      )
    : PHONE_CODES;

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setFilterQuery('');
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!dropdownOpen || !listRef.current) return;
    const el = listRef.current.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, dropdownOpen]);

  function select(dial: string, iso: string) {
    touched.current = true;
    setDialCode(dial);
    setDialIso(iso);
    setDropdownOpen(false);
    setFilterQuery('');
    onChange(`${dial} ${number}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) select(filtered[highlight].dial, filtered[highlight].code);
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
      setFilterQuery('');
    }
  }

  function applyNumber(raw: string) {
    touched.current = true;
    const n = raw.replace(/[^\d\s\-()]/g, '');
    setNumber(n);
    onChange(`${dialCode} ${n}`);
  }
  // onBlur re-reads the field so an AUTOFILLED value (which often doesn't fire React's onChange) is
  // captured and validated the moment the mentor leaves the field - not only once they start typing.
  function handleNumber(e: React.ChangeEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) {
    applyNumber(e.target.value);
  }

  // Client-side format/length check for the selected country (no SMS, no cost).
  const invalid = number.replace(/\D/g, '').length > 0 && !isValidPhoneNumber(number, dialIso as CountryCode);

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}{required && <span className="text-foreground ml-0.5">*</span>}
        </label>
      )}
      <div className="flex gap-0 relative">
        {/* Country code picker */}
        <button
          type="button"
          onClick={() => { setDropdownOpen((o) => !o); setHighlight(0); }}
          className={cn(
            'flex items-center gap-1.5 px-3 h-10 rounded-l-lg border-r-0 text-sm bg-white',
            'shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]',
            'hover:bg-brand-50 whitespace-nowrap shrink-0',
          )}
        >
          <Flag code={dialIso} />
          <span className="font-medium text-foreground">{dialCode}</span>
          <svg className="h-3 w-3 text-muted ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Number input */}
        <input
          type="tel"
          inputMode="numeric"
          value={number}
          onChange={handleNumber}
          onBlur={handleNumber}
          placeholder="612 345 678"
          required={required}
          autoComplete="tel-national"
          className={cn(
            'flex-1 h-10 px-3 rounded-r-lg text-sm bg-white text-foreground',
            'shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]',
            'focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25),0_1px_2px_rgba(15,23,42,0.04)]',
            'placeholder:text-muted',
            invalid && 'shadow-[0_0_0_1px_rgba(220,38,38,0.5)] focus:shadow-[0_0_0_2px_rgba(220,38,38,0.35)]',
          )}
        />

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute top-full left-0 z-50 mt-1 w-64 bg-white rounded-xl border border-[--color-border] shadow-xl overflow-hidden">
            <div className="p-2 border-b border-[--color-border]">
              <input
                type="text"
                autoFocus
                value={filterQuery}
                onChange={(e) => { setFilterQuery(e.target.value); setHighlight(0); }}
                onKeyDown={onKeyDown}
                placeholder="Search country"
                className="w-full px-2 py-1.5 text-sm rounded-lg bg-brand-50 focus:outline-none placeholder:text-muted"
              />
            </div>
            <ul ref={listRef} className="max-h-52 overflow-y-auto py-1">
              {filtered.length === 0 && <li className="px-3 py-2 text-sm text-muted">No results</li>}
              {filtered.map((c, i) => (
                <li
                  key={c.code}
                  onClick={() => select(c.dial, c.code)}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer',
                    i === highlight && 'bg-brand-50',
                  )}
                >
                  <Flag code={c.code} />
                  <span className="flex-1 text-foreground">{c.name}</span>
                  <span className="text-muted shrink-0">{c.dial}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {invalid
        ? <p className="text-xs text-red-600">Enter a valid phone number for the selected country.</p>
        : hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
