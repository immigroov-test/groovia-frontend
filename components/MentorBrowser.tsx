'use client';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Search, Plus, X, Sparkles } from 'lucide-react';
import { MentorCard } from './MentorCard';
import { MultiSelect, type SelectOption } from './ui/MultiSelect';
import { Flag } from './ui/Flag';
import { pricingCountry } from '../lib/geo';
import { countryLabel } from '../lib/countries';
import { languageLabel } from '../lib/languages';
import { EXPERTISE_CATEGORY_MAP } from '../lib/content';
import type { Mentor } from '../lib/types';

interface DisplayPrice { original: number; discounted: number; currency: string }

const CATEGORY_LABELS = EXPERTISE_CATEGORY_MAP;

// Distinct, non-empty values from a set of mentors, so each filter only offers what
// actually exists across the listed mentors.
function distinct(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

type FilterValue = string[] | boolean;

interface FilterDef {
  key: string;
  label: string;
  kind: 'multi' | 'toggle';
  icon?: ReactNode;
  placeholder?: string;
  options?: (mentors: Mentor[]) => SelectOption[];       // multi only
  match: (m: Mentor, value: FilterValue) => boolean;
}

const byLabel = (a: SelectOption, b: SelectOption) => a.label.localeCompare(b.label);

// Add new filters here - the UI (Add-filters menu, controls, matching) is fully
// data-driven off this list.
const FILTERS: FilterDef[] = [
  {
    key: 'country', label: 'Country', kind: 'multi', placeholder: 'Any country',
    options: (ms) => distinct(ms.flatMap((m) => m.expertise_country_codes ?? []))
      .map((c) => ({ value: c, label: countryLabel(c), icon: <Flag code={c} /> })).sort(byLabel),
    match: (m, v) => (v as string[]).length === 0 || (v as string[]).some((c) => (m.expertise_country_codes ?? []).includes(c)),
  },
  {
    key: 'topic', label: 'Topic', kind: 'multi', placeholder: 'Any topic',
    options: (ms) => distinct(ms.flatMap((m) => m.expertise_categories ?? []))
      .map((c) => ({ value: c, label: CATEGORY_LABELS[c] ?? c })).sort(byLabel),
    match: (m, v) => (v as string[]).length === 0 || (v as string[]).some((c) => (m.expertise_categories ?? []).includes(c)),
  },
  {
    key: 'language', label: 'Language', kind: 'multi', placeholder: 'Any language',
    options: (ms) => distinct(ms.flatMap((m) => m.languages ?? []))
      .map((l) => ({ value: l, label: languageLabel(l) })).sort(byLabel),
    match: (m, v) => (v as string[]).length === 0 || (v as string[]).some((l) => (m.languages ?? []).includes(l)),
  },
  {
    key: 'profession', label: 'Profession', kind: 'multi', placeholder: 'Any profession',
    options: (ms) => distinct(ms.flatMap((m) => m.professional_domains ?? []))
      .map((p) => ({ value: p, label: p })).sort(byLabel),
    match: (m, v) => (v as string[]).length === 0 || (v as string[]).some((p) => (m.professional_domains ?? []).includes(p)),
  },
  {
    key: 'fair_pricing', label: 'Fair pricing', kind: 'toggle', icon: <Sparkles className="h-3.5 w-3.5" />,
    match: (m, v) => !v || !!m.smart_pricing,
  },
];

export function MentorBrowser({ mentors }: { mentors: Mentor[] }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState<Record<string, FilterValue>>({});
  const [addOpen, setAddOpen] = useState(false);

  // Localized "from" price per mentor id (customer currency + PPP), so fair-pricing
  // mentors show the original struck through beside the discounted price. Best-effort:
  // on any failure cards fall back to the mentor-currency min_price.
  const [priceMap, setPriceMap] = useState<Record<string, DisplayPrice>>({});
  useEffect(() => {
    const paid = mentors.filter((m) => (m.min_price ?? 0) > 0);
    if (paid.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const country = await pricingCountry();
        if (cancelled) return;
        const res = await fetch('/api/pricing/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            country: country ?? null,
            items: paid.map((m) => ({ key: m.id, amount: m.min_price, from: m.price_currency ?? 'USD', is_ppp: !!m.smart_pricing, mentor_country: m.country ?? null, mentor_id: m.id })),
          }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const map: Record<string, DisplayPrice> = {};
        for (const p of (data.prices ?? [])) map[p.key] = { original: p.you0, discounted: p.you, currency: p.customer_currency };
        if (!cancelled) setPriceMap(map);
      } catch { /* keep min_price fallback */ }
    })();
    return () => { cancelled = true; };
  }, [mentors]);

  const activeKeys = Object.keys(active);
  const available = FILTERS.filter((f) => !activeKeys.includes(f.key));

  function addFilter(f: FilterDef) {
    setActive((a) => ({ ...a, [f.key]: f.kind === 'toggle' ? true : [] }));
    setAddOpen(false);
  }
  function removeFilter(key: string) {
    setActive((a) => { const n = { ...a }; delete n[key]; return n; });
  }

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return mentors.filter((m) => {
      if (ql) {
        const hay = `${m.display_name} ${m.headline ?? ''} ${(m.professional_domains ?? []).join(' ')}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      for (const key of activeKeys) {
        const def = FILTERS.find((f) => f.key === key);
        if (def && !def.match(m, active[key])) return false;
      }
      return true;
    });
  }, [mentors, q, active, activeKeys]);

  const hasFilters = !!q || activeKeys.length > 0;

  return (
    <>
      <div className="mb-8 flex flex-col gap-3">
        {/* Search + Add filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search mentors, roles…"
              className="w-full h-11 pl-10 pr-3.5 rounded-full bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(0,0,0,0.2)]"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setAddOpen((o) => !o)}
              disabled={available.length === 0}
              className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-white text-sm font-medium text-brand-900 shadow-[0_0_0_1px_rgba(15,23,42,0.08)] hover:bg-brand-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" /> Add filters
            </button>
            {addOpen && available.length > 0 && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setAddOpen(false)} />
                <div className="absolute left-0 z-30 mt-1 w-52 rounded-xl bg-white border border-[--color-border] shadow-lg py-1">
                  {available.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => addFilter(f)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-brand-50 text-left"
                    >
                      {f.icon}{f.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {hasFilters && (
            <button onClick={() => { setQ(''); setActive({}); }} className="text-sm text-muted hover:text-foreground px-3 py-2 h-11">
              Clear all
            </button>
          )}
        </div>

        {/* Active filter controls */}
        {activeKeys.length > 0 && (
          <div className="flex flex-wrap items-start gap-3">
            {activeKeys.map((key) => {
              const def = FILTERS.find((f) => f.key === key);
              if (!def) return null;

              if (def.kind === 'toggle') {
                return (
                  <span key={key} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-full bg-amber-50 text-amber-800 text-sm font-medium">
                    {def.icon} {def.label}
                    <button type="button" onClick={() => removeFilter(key)} aria-label={`Remove ${def.label} filter`} className="text-amber-500 hover:text-amber-800">
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                );
              }

              return (
                <div key={key} className="min-w-[220px] max-w-xs flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{def.label}</span>
                    <button type="button" onClick={() => removeFilter(key)} aria-label={`Remove ${def.label} filter`} className="text-muted hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <MultiSelect
                    options={def.options!(mentors)}
                    value={active[key] as string[]}
                    onChange={(v) => setActive((a) => ({ ...a, [key]: v }))}
                    placeholder={def.placeholder}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted">No mentors match your filters.</div>
      ) : (
        <>
          <p className="text-sm text-muted mb-4">{filtered.length} mentor{filtered.length !== 1 ? 's' : ''}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 reveal-children">
            {filtered.map((m) => <MentorCard key={m.id} mentor={m} price={priceMap[m.id]} />)}
          </div>
        </>
      )}
    </>
  );
}
