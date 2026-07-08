'use client';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Toggle } from './ui/Toggle';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

export interface DraftService { title: string; duration: number; active: boolean }

const DURATIONS = [15, 30, 45, 60] as const;

export function activeServiceCount(list: DraftService[]): number {
  return list.filter((s) => s.active).length;
}

// Local session-type builder used in the onboarding wizard. Each duration is offered
// once; at least one active session is required before the mentor can submit.
export function ServiceListEditor({ value, onChange }: { value: DraftService[]; onChange: (s: DraftService[]) => void }) {
  const used = new Set(value.map((s) => s.duration));
  const available = DURATIONS.filter((d) => !used.has(d));

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState<number>(available[0] ?? 30);
  const [err, setErr] = useState<string | null>(null);

  function startAdd() {
    setTitle('');
    setDuration(available[0] ?? 30);
    setErr(null);
    setAdding(true);
  }
  function save() {
    if (!title.trim()) { setErr('Give the session a title.'); return; }
    if (used.has(duration)) { setErr('You already have a session of this length.'); return; }
    onChange([...value, { title: title.trim(), duration, active: true }]);
    setAdding(false);
  }
  function remove(i: number) { onChange(value.filter((_, idx) => idx !== i)); }
  function toggle(i: number) { onChange(value.map((s, idx) => (idx === i ? { ...s, active: !s.active } : s))); }

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
          <button type="button" onClick={() => remove(i)} aria-label="Delete session"
            className="h-9 w-9 flex items-center justify-center rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      ))}

      {adding ? (
        <div className="rounded-xl border border-[--color-border] p-4 flex flex-col gap-3">
          <Input label="Title *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Quick career chat" autoFocus />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Duration *</label>
            <select value={String(duration)} onChange={(e) => setDuration(parseInt(e.target.value))}
              className="h-10 px-3 rounded-lg bg-white text-sm border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300">
              {available.map((d) => <option key={d} value={d}>{d} minutes</option>)}
            </select>
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
