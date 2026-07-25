'use client';
import { Plus, Trash2 } from 'lucide-react';
import { Toggle } from './ui/Toggle';
import { Input } from './ui/Input';
import { RichTextEditor } from './ui/RichTextEditor';
import { SERVICE_CATEGORIES } from '../lib/content';
import { SERVICE_CATALOG, catalogByCategory, type CatalogService } from '../lib/serviceCatalog';
import { proratePrice, type DraftService } from './ServiceListEditor';

// BUG-043: mentors pick services from a category-grouped catalogue (switch on the ones they offer,
// edit the prefilled title/description, choose a duration). Price is derived from the base hourly
// rate, so there's no per-service price field. A custom-service option covers anything not listed.
const DURATIONS = [15, 30, 45, 60] as const;
const CATALOG_CODES = new Set(SERVICE_CATALOG.map((c) => c.code));

function priceLabel(s: DraftService, hourlyRate: number | undefined, currency: string): string {
  if (s.free) return 'Free';
  const p = proratePrice(hourlyRate, s.duration);
  return p > 0 ? `${currency} ${p}` : 'Set your rate above';
}

export function ServiceCatalog({
  value, onChange, hourlyRate, currency = 'USD',
}: {
  value: DraftService[]; onChange: (s: DraftService[]) => void; hourlyRate?: number; currency?: string;
}) {
  const byCode = new Map(value.map((v) => [v.code ?? '', v]));
  const groups = catalogByCategory(SERVICE_CATEGORIES);
  const customs = value.filter((v) => v.code && !CATALOG_CODES.has(v.code));

  function patch(code: string, p: Partial<DraftService>) {
    onChange(value.map((v) => (v.code === code ? { ...v, ...p } : v)));
  }
  function removeByCode(code: string) { onChange(value.filter((v) => v.code !== code)); }

  function toggleCatalog(cat: CatalogService, on: boolean) {
    if (!on) { removeByCode(cat.code); return; }
    onChange([...value, {
      code: cat.code, title: cat.title, duration: cat.duration, active: true,
      price: cat.free ? 0 : proratePrice(hourlyRate, cat.duration),
      description: cat.description, category: cat.category, tags: [], free: !!cat.free,
    }]);
  }
  function addCustom() {
    onChange([...value, {
      code: `custom-${crypto.randomUUID()}`, title: '', duration: 30, active: true,
      price: proratePrice(hourlyRate, 30), description: '', category: 'General Guidance', tags: [], free: false,
    }]);
  }

  // Editable panel shared by catalogue + custom services.
  function editor(s: DraftService, opts: { titlePlaceholder?: string } = {}) {
    return (
      <div className="mt-3 flex flex-col gap-3 border-t border-[--color-border] pt-3">
        <Input label="Title" value={s.title} onChange={(e) => patch(s.code!, { title: e.target.value })}
          placeholder={opts.titlePlaceholder ?? 'Session title'} />
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Duration</label>
            <select value={String(s.duration)}
              onChange={(e) => patch(s.code!, { duration: parseInt(e.target.value), price: s.free ? 0 : proratePrice(hourlyRate, parseInt(e.target.value)) })}
              className="h-10 px-3 rounded-lg bg-white text-sm border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300">
              {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Price</span>
            <span className="h-10 flex items-center text-sm text-muted">{priceLabel(s, hourlyRate, currency)}</span>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted h-10 cursor-pointer">
            <input type="checkbox" className="accent-[--color-brand-500]" checked={!!s.free}
              onChange={(e) => patch(s.code!, { free: e.target.checked, price: e.target.checked ? 0 : proratePrice(hourlyRate, s.duration) })} />
            Offer for free
          </label>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Description</label>
          <RichTextEditor value={s.description} onChange={(html) => patch(s.code!, { description: html })} maxChars={1000}
            placeholder="Describe what this session covers and who it's for." />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <div key={g.category}>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">{g.category}</h3>
          <div className="flex flex-col gap-2.5">
            {g.services.map((cat) => {
              const cur = byCode.get(cat.code);
              const on = !!cur;
              return (
                <div key={cat.code} className="rounded-xl border border-[--color-border] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{cat.title}</p>
                      <p className="text-xs text-muted">{cat.free ? 'Free' : `${cat.duration} min`}{on ? '' : ' · not offered'}</p>
                    </div>
                    <Toggle checked={on} onChange={() => toggleCatalog(cat, !on)} aria-label={`Offer ${cat.title}`} />
                  </div>
                  {on && cur && editor(cur)}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Custom services the mentor adds themselves */}
      <div>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Your own services</h3>
        <div className="flex flex-col gap-2.5">
          {customs.map((s) => (
            <div key={s.code} className="rounded-xl border border-[--color-border] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground truncate">{s.title.trim() || 'Untitled service'}</p>
                <button type="button" onClick={() => removeByCode(s.code!)} aria-label="Remove service"
                  className="h-9 w-9 flex items-center justify-center rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              {editor(s, { titlePlaceholder: 'e.g. Portfolio review' })}
            </div>
          ))}
          <button type="button" onClick={addCustom}
            className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900 transition-colors">
            <Plus className="h-4 w-4" /> Add a custom service
          </button>
        </div>
      </div>
    </div>
  );
}
