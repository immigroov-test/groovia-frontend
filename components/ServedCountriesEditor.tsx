'use client';
import { Plus, Trash2 } from 'lucide-react';
import { CountrySelect } from './ui/CountrySelect';
import { countryLabel } from '../lib/countries';

export interface ServedCountry {
  code: string;
  years: string;   // kept as a string for the input; parsed to int (or omitted) on submit
}

const MAX_SERVED_COUNTRIES = 2;

// BUG-065 + FEAT-016: replaces the old single required "Home country" field. A mentor can (not
// mandatory) add up to 2 other countries they've lived in / can advise on, each with its own years
// lived there - e.g. an Indian citizen who lived in Germany before moving to Sweden. The backend
// derives expertise_country_codes from currentCountry + these codes (routers/mentor.py
// _derive_expertise), so there's no separate "Countries of Expertise" picker to keep in sync.
export function ServedCountriesEditor({
  currentCountry, value, onChange,
}: {
  currentCountry: string;
  value: ServedCountry[];
  onChange: (v: ServedCountry[]) => void;
}) {
  const used = new Set([currentCountry, ...value.map((r) => r.code)].filter(Boolean));
  const canAddMore = value.length < MAX_SERVED_COUNTRIES;

  function setRow(i: number, patch: Partial<ServedCountry>) {
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    if (!canAddMore) return;
    onChange([...value, { code: '', years: '' }]);
  }
  function removeRow(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">
        Additional countries lived <span className="font-normal text-muted">(optional, up to {MAX_SERVED_COUNTRIES})</span>
      </span>
      <p className="text-xs text-muted leading-relaxed">
        Other countries you&apos;ve lived in and can advise mentees on - e.g. moved from India to Germany
        before settling in Sweden. Shown to mentees alongside how long you lived in each.
      </p>
      {value.map((r, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="w-56">
            <CountrySelect value={r.code} onChange={(code) => setRow(i, { code })} placeholder="Select country" />
          </div>
          <input type="number" min={0} max={60} value={r.years}
            onChange={(e) => setRow(i, { years: e.target.value })}
            placeholder="Years"
            className="h-11 w-24 px-3 rounded-xl bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]" />
          <button type="button" onClick={() => removeRow(i)} aria-label="Remove country"
            className="h-11 w-11 flex items-center justify-center rounded-xl text-muted hover:text-red-600 hover:bg-red-50">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      ))}
      {canAddMore && (
        <button type="button" onClick={addRow}
          className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900 w-fit mt-1">
          <Plus className="h-4 w-4" /> Add a country
        </button>
      )}
      {/* BUG-110: the profile lists current country + these, so without showing the current one here the
          two lists look like they disagree and mentors think countries went missing. */}
      {currentCountry && (
        <p className="text-xs text-muted mt-1">
          Your profile shows these as <span className="font-medium text-foreground">Guides moves to</span>:{' '}
          {[currentCountry, ...value.map((r) => r.code)].filter(Boolean).map(countryLabel).join(', ')}.
          Your current country is always included.
        </p>
      )}
    </div>
  );
}

// {code, years} rows (years as a string for the input) -> the [{code, years}] payload the backend
// expects (years omitted, not 0, when left blank).
export function servedCountriesPayload(rows: ServedCountry[]): { code: string; years?: number }[] {
  return rows
    .filter((r) => r.code)
    .map((r) => (r.years.trim() ? { code: r.code, years: parseInt(r.years, 10) } : { code: r.code }));
}
