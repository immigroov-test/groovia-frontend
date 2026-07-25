'use client';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Toggle } from './ui/Toggle';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { RichTextEditor } from './ui/RichTextEditor';
import { TagInput } from './ui/TagInput';
import { SERVICE_CATEGORIES, SERVICE_DESCRIPTION_TEMPLATE } from '../lib/content';
import { isRichTextEmpty } from '../lib/sanitizeHtml';

export interface DraftService {
  title: string; duration: number; active: boolean; price: number;
  description: string; category: string; tags: string[];
  code?: string;    // catalogue code (BUG-043), or 'custom-<uuid>' for a mentor's own service
  free?: boolean;   // offered free (price 0 regardless of the base rate)
}

const DURATIONS = [15, 30, 45, 60] as const;

export function activeServiceCount(list: DraftService[]): number {
  return list.filter((s) => s.active).length;
}

// Price prorated from the hourly rate for a given duration (rounded to 2dp).
export function proratePrice(hourlyRate: number | undefined, duration: number): number {
  if (!hourlyRate || hourlyRate <= 0) return 0;
  return Math.round(hourlyRate * (duration / 60) * 100) / 100;
}

// Local session-type builder used in the onboarding wizard. Each duration is offered
// once. Each session's price defaults to the mentor's hourly rate prorated by its
// length, and stays editable per session.
export function ServiceListEditor({
  value, onChange, hourlyRate, currency = 'USD',
}: {
  value: DraftService[]; onChange: (s: DraftService[]) => void; hourlyRate?: number; currency?: string;
}) {
  const used = new Set(value.map((s) => s.duration));
  const available = DURATIONS.filter((d) => !used.has(d));

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState<number>(available[0] ?? 30);
  const [price, setPrice] = useState<number>(proratePrice(hourlyRate, available[0] ?? 30));
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  function startAdd() {
    const d = available[0] ?? 30;
    setTitle(''); setDuration(d); setPrice(proratePrice(hourlyRate, d));
    setDescription(SERVICE_DESCRIPTION_TEMPLATE); setCategory(''); setTags([]); setErr(null); setAdding(true);
  }
  function save() {
    if (!title.trim()) { setErr('Give the session a title.'); return; }
    if (used.has(duration)) { setErr('You already have a session of this length.'); return; }
    onChange([...value, {
      title: title.trim(), duration, active: true, price: Math.max(0, price || 0),
      description: isRichTextEmpty(description) ? '' : description, category, tags,
    }]);
    setAdding(false);
  }
  function remove(i: number) { onChange(value.filter((_, idx) => idx !== i)); }
  function toggle(i: number) { onChange(value.map((s, idx) => (idx === i ? { ...s, active: !s.active } : s))); }
  function setPriceAt(i: number, v: number) {
    onChange(value.map((s, idx) => (idx === i ? { ...s, price: Math.max(0, v || 0) } : s)));
  }

  return (
    <div className="flex flex-col gap-3">
      {value.map((s, i) => (
        <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-[--color-border] p-3">
          <div className="flex items-center gap-3 min-w-0">
            <Toggle checked={s.active} onChange={() => toggle(i)} aria-label={`Activate ${s.title}`} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
              <p className="text-xs text-muted">{s.duration} min{s.active ? '' : ' · inactive'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted">{currency}</span>
              <input
                type="number" min={0} step="0.01" value={s.price}
                onChange={(e) => setPriceAt(i, parseFloat(e.target.value))}
                aria-label={`Price for ${s.title}`}
                className="h-9 w-20 px-2 rounded-lg bg-white text-sm text-right border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
            <button type="button" onClick={() => remove(i)} aria-label="Delete session"
              className="h-9 w-9 flex items-center justify-center rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="rounded-xl border border-[--color-border] p-4 flex flex-col gap-3">
          <Input label="Title *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Quick career chat" autoFocus />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Duration *</label>
              <select value={String(duration)} onChange={(e) => { const d = parseInt(e.target.value); setDuration(d); setPrice(proratePrice(hourlyRate, d)); }}
                className="h-10 px-3 rounded-lg bg-white text-sm border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300">
                {available.map((d) => <option key={d} value={d}>{d} minutes</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Price ({currency})</label>
              <input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))}
                className="h-10 px-3 rounded-lg bg-white text-sm border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="h-10 px-3 rounded-lg bg-white text-sm border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300">
                <option value="">Select a category</option>
                {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Description</label>
            <RichTextEditor value={description} onChange={setDescription} maxChars={1000}
              placeholder="e.g. A focused call to review your CV and tailor it for the Dutch job market, with concrete next steps." />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Tags <span className="text-muted font-normal">(keywords for search &amp; matching)</span></label>
            <TagInput value={tags} onChange={setTags} max={5} placeholder="e.g. CV review, Dutch market, HSM visa" />
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="accent" size="sm" onClick={save}>Add session</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : available.length > 0 ? (
        <button type="button" onClick={startAdd}
          className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900 transition-colors">
          <Plus className="h-4 w-4" /> Add session type
        </button>
      ) : (
        <p className="text-xs text-muted">You have a session type for every length (15, 30, 45, 60 min).</p>
      )}
    </div>
  );
}
