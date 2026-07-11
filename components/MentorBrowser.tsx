'use client';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { MentorCard } from './MentorCard';
import { MultiSelect } from './ui/MultiSelect';
import { Flag } from './ui/Flag';
import { countryLabel } from '../lib/countries';
import type { Mentor } from '../lib/types';

const CATEGORY_LABELS: Record<string, string> = {
  job_career: 'Career',
  study_abroad: 'Study',
  visa_pr: 'Visa & PR',
  life_settling: 'Life abroad',
};

export function MentorBrowser({ mentors }: { mentors: Mentor[] }) {
  const [q, setQ] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [category, setCategory] = useState('');

  const countries = useMemo(() => {
    const s = new Set<string>();
    mentors.forEach((m) => m.expertise_country_codes.forEach((c) => s.add(c)));
    return Array.from(s);
  }, [mentors]);

  // Full country names, alphabetically, with flags - searchable + multi-select.
  const countryOptions = useMemo(
    () => countries
      .map((c) => ({ value: c, label: countryLabel(c), icon: <Flag code={c} /> }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [countries],
  );

  const categories = useMemo(() => {
    const s = new Set<string>();
    mentors.forEach((m) => (m.expertise_categories ?? []).forEach((c) => s.add(c)));
    return Array.from(s).sort();
  }, [mentors]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return mentors.filter((m) => {
      if (selectedCountries.length && !selectedCountries.some((c) => m.expertise_country_codes.includes(c))) return false;
      if (category && !(m.expertise_categories ?? []).includes(category)) return false;
      if (ql) {
        const hay = `${m.display_name} ${m.headline ?? ''} ${(m.professional_domains ?? []).join(' ')}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [mentors, q, selectedCountries, category]);

  const hasFilters = !!(q || selectedCountries.length || category);

  return (
    <>
      <div className="mb-8 flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search mentors, roles…"
            className="w-full h-11 pl-10 pr-3.5 rounded-full bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(0,0,0,0.2)]"
          />
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-[240px]">
            <MultiSelect options={countryOptions} value={selectedCountries} onChange={setSelectedCountries}
              placeholder="Filter by country…" />
          </div>
          <FilterSelect label="All topics" value={category} onChange={setCategory} options={categories.map((c) => ({ value: c, label: CATEGORY_LABELS[c] ?? c }))} />
          {hasFilters && (
            <button onClick={() => { setQ(''); setSelectedCountries([]); setCategory(''); }} className="text-sm text-muted hover:text-foreground px-3 py-2 h-10">
              Clear
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted">No mentors match your filters.</div>
      ) : (
        <>
          <p className="text-sm text-muted mb-4">{filtered.length} mentor{filtered.length !== 1 ? 's' : ''}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 reveal-children">
            {filtered.map((m) => <MentorCard key={m.id} mentor={m} />)}
          </div>
        </>
      )}
    </>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 px-4 rounded-full bg-white text-sm text-foreground shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(0,0,0,0.2)] cursor-pointer"
    >
      <option value="">{label}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
