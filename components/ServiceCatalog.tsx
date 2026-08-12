'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
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

// Map a mentor's Area-of-Expertise codes to catalogue service categories, so we show only the
// templates relevant to what they picked on the first page. General Guidance is always available.
const EXPERTISE_TO_SERVICE_CATS: Record<string, string[]> = {
  job_career: ['Jobs & Careers'],
  study_abroad: ['Education & Studies'],
  visa_pr: ['Visa & Immigration'], work_visa: ['Visa & Immigration'],
  family_visa: ['Visa & Immigration'], asylum: ['Visa & Immigration'],
  life_settling: ['Housing & Relocation', 'Culture & Daily Life', 'Finance & Taxes'],
  entrepreneur: ['Business & Startup'],
};

export function ServiceCatalog({
  value, onChange, hourlyRate, currency = 'USD', categories,
}: {
  value: DraftService[]; onChange: (s: DraftService[]) => void; hourlyRate?: number; currency?: string; categories?: string[];
}) {
  const byCode = new Map(value.map((v) => [v.code ?? '', v]));
  // A mentor offers at most one service per duration - the same rule ServicesManager.tsx enforces on
  // the ongoing dashboard. The BUG-043 tag redesign dropped this (the older ServiceListEditor it
  // replaced had it), so a new mentor tapping several catalogue tags at signup - most of which default
  // to 30 or 45 min - could silently fill all 4 duration slots before ever reaching their dashboard,
  // where "Add a session" then disappears entirely with no explanation.
  const usedDurations = new Set(value.map((v) => v.duration));
  const availableDurations = DURATIONS.filter((d) => !usedDurations.has(d));
  const canAddMore = availableDurations.length > 0;
  // Only one service is expanded at a time; the rest collapse to a compact card (name + toggle +
  // delete). Adding a new one expands it and collapses the others.
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  // Only the categories matching the mentor's selected areas (+ General Guidance). If they picked
  // none yet, fall back to the full catalogue so they're never stuck with nothing to add.
  const allowed = new Set<string>(['General Guidance']);
  (categories ?? []).forEach((c) => (EXPERTISE_TO_SERVICE_CATS[c] ?? []).forEach((sc) => allowed.add(sc)));
  const groups = catalogByCategory(SERVICE_CATEGORIES)
    .filter((g) => (categories && categories.length ? allowed.has(g.category) : true));

  function patch(code: string, p: Partial<DraftService>) {
    onChange(value.map((v) => (v.code === code ? { ...v, ...p } : v)));
  }
  function removeByCode(code: string) { onChange(value.filter((v) => v.code !== code)); }

  // Tap a catalogue tag -> add it as an active block, prefilled from the template, and expand it
  // (collapsing whatever was open).
  function addCatalog(cat: CatalogService) {
    if (byCode.has(cat.code) || !canAddMore) return;
    // If the template's default length is already taken, fall back to the next open one - same
    // remap ServicesManager.tsx does when a catalogue tag collides with an existing duration.
    const duration = (availableDurations as readonly number[]).includes(cat.duration) ? cat.duration : availableDurations[0];
    onChange([...value, {
      code: cat.code, title: cat.title, duration, active: true,
      price: cat.free ? 0 : proratePrice(hourlyRate, duration),
      description: cat.description, category: cat.category, tags: [], free: !!cat.free,
    }]);
    setExpandedCode(cat.code);
  }
  function addCustom() {
    if (!canAddMore) return;
    const code = `custom-${crypto.randomUUID()}`;
    const duration = availableDurations[0] ?? 30;
    onChange([...value, {
      code, title: '', duration, active: true,
      price: proratePrice(hourlyRate, duration), description: '', category: 'General Guidance', tags: [], free: false,
    }]);
    setExpandedCode(code);
  }

  function block(s: DraftService) {
    const custom = isCustom(s.code);
    const expanded = s.code === expandedCode;
    return (
      <div key={s.code} className={cn(
        'rounded-xl border border-[--color-border] p-3 transition-opacity',
        !s.active && 'opacity-60',
      )}>
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => setExpandedCode(expanded ? null : (s.code ?? null))}
            className="min-w-0 flex-1 flex items-center gap-2 text-left">
            {expanded ? <ChevronUp className="h-4 w-4 text-muted shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted shrink-0" />}
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground truncate">{s.title.trim() || 'Untitled service'}</span>
              <span className="block text-xs text-muted">{s.duration} min · {priceLabel(s, hourlyRate, currency)}{!s.active ? ' · inactive' : ''}</span>
            </span>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <Toggle checked={s.active} onChange={() => patch(s.code!, { active: !s.active })}
              aria-label={s.active ? 'Deactivate service' : 'Activate service'} />
            <button type="button" onClick={() => removeByCode(s.code!)} aria-label="Remove service"
              className="h-9 w-9 flex items-center justify-center rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 flex flex-col gap-3 border-t border-[--color-border] pt-3">
            {custom && (
              <Input label="Title" value={s.title} onChange={(e) => patch(s.code!, { title: e.target.value })}
                placeholder="e.g. Portfolio review" />
            )}
            {custom && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Category</label>
                <select value={s.category ?? 'General Guidance'}
                  onChange={(e) => patch(s.code!, { category: e.target.value })}
                  className="h-10 px-3 rounded-lg bg-white text-sm border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300">
                  {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Duration</label>
                <select value={String(s.duration)}
                  onChange={(e) => { const d = parseInt(e.target.value); patch(s.code!, { duration: d, price: s.free ? 0 : proratePrice(hourlyRate, d) }); }}
                  className="h-10 px-3 rounded-lg bg-white text-sm border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300">
                  {/* Only lengths not already used by another session, plus this session's own current
                      one - otherwise switching a service's length here could collide with another. */}
                  {[...new Set([s.duration, ...availableDurations])].sort((a, b) => a - b)
                    .map((d) => <option key={d} value={d}>{d} minutes</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">Price</span>
                <span className="h-10 flex items-center text-sm text-muted">{priceLabel(s, hourlyRate, currency)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Description <span className="text-muted font-normal">(can be edited)</span></label>
              <RichTextEditor value={s.description} onChange={(html) => patch(s.code!, { description: html })} maxChars={1000}
                placeholder="Describe what this session covers and who it's for." />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Catalogue tags: tap to add. Placed ABOVE the selected list so a tapped session drops into
          "Your sessions" right below it (BUG-070). Only templates not already added are shown. */}
      <div>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">
          {value.length > 0 ? 'Add another session' : 'Choose the sessions you offer'}
        </h3>
        {!canAddMore ? (
          <p className="text-xs text-muted">
            You have a session for every length (15, 30, 45, 60 min). Remove one first to add a
            different one.
          </p>
        ) : (
        <div className="flex flex-col gap-4">
          {/* The single free session (Introductory call) is offered as its own category; it is the
              only free service a mentor can add (BUG-059). */}
          {(() => {
            const freeTags = SERVICE_CATALOG.filter((c) => c.free && !byCode.has(c.code));
            if (freeTags.length === 0) return null;
            return (
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">
                  Introductory call <span className="text-xs font-normal text-emerald-700">· free</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {freeTags.map((cat) => (
                    <button key={cat.code} type="button" onClick={() => addCatalog(cat)}
                      className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100 transition-colors">
                      {cat.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
          {groups.map((g) => {
            const tags = g.services.filter((cat) => !byCode.has(cat.code) && !cat.free);
            if (tags.length === 0) return null;
            return (
              <div key={g.category}>
                <p className="text-sm font-semibold text-foreground mb-2">{g.category}</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((cat) => (
                    <button key={cat.code} type="button" onClick={() => addCatalog(cat)}
                      className="inline-flex items-center rounded-full border border-[--color-border] bg-white px-3 py-1.5 text-sm text-foreground hover:border-brand-500 hover:bg-brand-50 transition-colors">
                      {cat.title}
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
        )}
      </div>

      {/* Selected services -> editable blocks, listed BELOW the picker (BUG-070) */}
      {value.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Your sessions</h3>
          {value.map((s) => block(s))}
        </div>
      )}
    </div>
  );
}
