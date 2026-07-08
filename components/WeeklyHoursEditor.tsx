'use client';
import { Plus, Trash2 } from 'lucide-react';
import { Toggle } from './ui/Toggle';
import { cn } from '../lib/utils';

export interface DayHours { start: string; end: string }
// Keyed by full weekday name. Empty array = day off.
export type WeeklyHours = Record<string, DayHours[]>;

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export function emptyWeek(): WeeklyHours {
  return Object.fromEntries(WEEK_DAYS.map((d) => [d, [] as DayHours[]]));
}

function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number);
  const total = Math.min(h * 60 + m + mins, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Overlap / ordering check within a single day.
function dayError(slots: DayHours[]): string | null {
  for (const s of slots) if (s.end <= s.start) return 'end time must be after the start time';
  const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) return 'time slots overlap';
  }
  return null;
}

// Returns an error string (blocks submit) or null. Used by the wizard to gate the
// Submit button and show a message, exactly like cal.com refusing overlapping ranges.
export function validateWeeklyHours(w: WeeklyHours): string | null {
  let hasAny = false;
  for (const day of WEEK_DAYS) {
    const slots = w[day] ?? [];
    if (slots.length) hasAny = true;
    const err = dayError(slots);
    if (err) return `${day}: ${err}.`;
  }
  if (!hasAny) return 'Add availability for at least one day.';
  return null;
}

// Flatten to the shape the backend stores (weekly_availability rows).
export function weeklyToSlots(w: WeeklyHours): { weekday: string; start_time: string; end_time: string }[] {
  const out: { weekday: string; start_time: string; end_time: string }[] = [];
  for (const day of WEEK_DAYS) for (const s of w[day] ?? []) out.push({ weekday: day, start_time: s.start, end_time: s.end });
  return out;
}

export function WeeklyHoursEditor({ value, onChange }: { value: WeeklyHours; onChange: (w: WeeklyHours) => void }) {
  function setDay(day: string, slots: DayHours[]) { onChange({ ...value, [day]: slots }); }

  function toggleDay(day: string) {
    const on = (value[day]?.length ?? 0) > 0;
    setDay(day, on ? [] : [{ start: '09:00', end: '17:00' }]);
  }
  function addSlot(day: string) {
    const slots = value[day] ?? [];
    const start = slots.length ? slots[slots.length - 1].end : '09:00';
    setDay(day, [...slots, { start, end: addMinutes(start, 60) }]);
  }
  function updateSlot(day: string, i: number, patch: Partial<DayHours>) {
    setDay(day, (value[day] ?? []).map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function removeSlot(day: string, i: number) {
    setDay(day, (value[day] ?? []).filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col divide-y divide-[--color-border]">
      {WEEK_DAYS.map((day) => {
        const slots = value[day] ?? [];
        const on = slots.length > 0;
        const err = dayError(slots);
        return (
          <div key={day} className="flex flex-col gap-2 py-3">
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-2.5 w-32 shrink-0 pt-1.5">
                <Toggle checked={on} onChange={() => toggleDay(day)} aria-label={day} />
                <span className={cn('text-sm font-medium', on ? 'text-foreground' : 'text-muted')}>{day}</span>
              </div>

              {!on ? (
                <span className="text-sm text-muted pt-2">Unavailable</span>
              ) : (
                <div className="flex flex-col gap-2 flex-1">
                  {slots.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 flex-wrap">
                      <input type="time" value={s.start} onChange={(e) => updateSlot(day, i, { start: e.target.value })}
                        className="h-9 px-2 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.12)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]" />
                      <span className="text-muted">-</span>
                      <input type="time" value={s.end} onChange={(e) => updateSlot(day, i, { end: e.target.value })}
                        className="h-9 px-2 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.12)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]" />
                      {i === 0 ? (
                        <button type="button" onClick={() => addSlot(day)} aria-label="Add time slot"
                          className="h-9 w-9 flex items-center justify-center rounded-lg text-muted hover:text-brand-700 hover:bg-brand-50 transition-colors">
                          <Plus className="h-5 w-5" />
                        </button>
                      ) : null}
                      {slots.length > 1 && (
                        <button type="button" onClick={() => removeSlot(day, i)} aria-label="Remove time slot"
                          className="h-9 w-9 flex items-center justify-center rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {err && <p className="text-xs text-red-600 ml-[8.75rem]">{day} {err}.</p>}
          </div>
        );
      })}
    </div>
  );
}
