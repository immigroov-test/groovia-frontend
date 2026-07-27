'use client';
import { Plus, Trash2 } from 'lucide-react';
import { Toggle } from './ui/Toggle';
import { Input } from './ui/Input';
import { RichTextEditor } from './ui/RichTextEditor';
import { SERVICE_CATEGORIES } from '../lib/content';
import { SERVICE_CATALOG, catalogByCategory, type CatalogService } from '../lib/serviceCatalog';
import { proratePrice, type DraftService } from './ServiceListEditor';
import { cn } from '../lib/utils';

// BUG-043 (redesigned): the catalogue reads as TAGS. Tapping a tag turns it into an editable block
// (title carried over, description prefilled, duration editable) and switches it on automatically.
// Toggling a block off marks that service inactive (kept, not offered); the trash icon removes it and
// the template returns to the tag row. Price is derived from the base hourly rate (no price field).
const DURATIONS = [15, 30, 45, 60] as const;
const CATALOG_CODES = new Set(SERVICE_CATALOG.map((c) => c.code));

function isCustom(code?: string): boolean {
  return !!code && !CATALOG_CODES.has(code);
}

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

  function patch(code: string, p: Partial<DraftService>) {
    onChange(value.map((v) => (v.code === code ? { ...v, ...p } : v)));
  }
  function removeByCode(code: string) { onChange(value.filter((v) => v.code !== code)); }

  // Tap a catalogue tag -> add it as an active block, prefilled from the template.
  function addCatalog(cat: CatalogService) {
    if (byCode.has(cat.code)) return;
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

  function block(s: DraftService) {
    const custom = isCustom(s.code);
    return (
      <div key={s.code} className={cn(
        'rounded-xl border border-[--color-border] p-3 transition-opacity',
        !s.active && 'opacity-60',
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {custom ? (
              <Input value={s.title} onChange={(e) => patch(s.code!, { title: e.target.value })}
                placeholder="e.g. Portfolio review" aria-label="Service title" />
            ) : (
              <p className="text-sm font-medium text-foreground">{s.title}</p>
            )}
            {!s.active && <p className="text-xs text-muted mt-1">Inactive — mentees won&apos;t see this.</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Toggle checked={s.active} onChange={() => patch(s.code!, { active: !s.active })}
              aria-label={s.active ? 'Deactivate service' : 'Activate service'} />
            <button type="button" onClick={() => removeByCode(s.code!)} aria-label="Remove service"
              className="h-9 w-9 flex items-center justify-center rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 border-t border-[--color-border] pt-3">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Duration</label>
              <select value={String(s.duration)}
                onChange={(e) => { const d = parseInt(e.target.value); patch(s.code!, { duration: d, price: s.free ? 0 : proratePrice(hourlyRate, d) }); }}
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
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Selected services -> editable blocks */}
      {value.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {value.map((s) => block(s))}
        </div>
      )}

      {/* Catalogue tags: tap to add. Only templates not already added are shown. */}
      <div>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">
          {value.length > 0 ? 'Add another session' : 'Choose the sessions you offer'}
        </h3>
        <p className="text-xs text-muted mb-3">Tap one to add it, then set the length and description.</p>
        <div className="flex flex-col gap-3">
          {groups.map((g) => {
            const tags = g.services.filter((cat) => !byCode.has(cat.code));
            if (tags.length === 0) return null;
            return (
              <div key={g.category}>
                <p className="text-xs font-medium text-muted mb-1.5">{g.category}</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((cat) => (
                    <button key={cat.code} type="button" onClick={() => addCatalog(cat)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[--color-border] bg-white px-3 py-1.5 text-sm text-foreground hover:border-brand-500 hover:bg-brand-50 transition-colors">
                      <Plus className="h-3.5 w-3.5 text-brand-600" /> {cat.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <div>
            <p className="text-xs font-medium text-muted mb-1.5">Something else</p>
            <button type="button" onClick={addCustom}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[--color-border] bg-white px-3 py-1.5 text-sm text-brand-700 hover:border-brand-500 hover:bg-brand-50 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add your own service
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
