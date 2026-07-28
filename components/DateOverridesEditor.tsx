'use client';
import { useMemo, useState } from 'react';
import { Ban, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

export interface DateOverride {
  slot_date: string;         // YYYY-MM-DD
  is_blackout: boolean;
  start_time?: string;       // HH:MM (custom hours)
  end_time?: string;
}

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayNameOf = (d: Date) => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][(d.getDay() + 6) % 7];

// Local (no-backend) version of the hub's date-override calendar, for the onboarding
// wizard. Tap a date to block it or set custom hours; builds a list the wizard submits.
export function DateOverridesEditor({
  value,
  onChange,
  activeWeekdays,
}: {
  value: DateOverride[];
  onChange: (next: DateOverride[]) => void;
  activeWeekdays: Set<string>;    // full weekday names that have weekly hours
}) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selDate, setSelDate] = useState<string | null>(null);
  const [ovFrom, setOvFrom] = useState('09:00');
  const [ovTo, setOvTo] = useState('17:00');
  const [err, setErr] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const m = new Map<string, DateOverride>();
    for (const o of value) m.set(o.slot_date, o);
    return m;
  }, [value]);

  const grid = useMemo(() => {
    const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (Date | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const todayKey = dateKey(now);
  const sel = selDate ? byDate.get(selDate) : undefined;

  function upsert(o: DateOverride) {
    onChange([...value.filter((x) => x.slot_date !== o.slot_date), o]);
    // Keep the date selected so the panel immediately shows the result (e.g. "Blocked for the day"
    // + Remove) instead of resetting to "Pick a date".
  }
  function removeOverride(date: string) {
    onChange(value.filter((x) => x.slot_date !== date));
  }
  function setCustom(date: string) {
    if (ovTo <= ovFrom) { setErr('End must be after start.'); return; }
    setErr(null);
    upsert({ slot_date: date, is_blackout: false, start_time: ovFrom, end_time: ovTo });
  }

  function statusOf(d: Date): 'blocked' | 'custom' | 'weekly' | 'none' {
    const o = byDate.get(dateKey(d));
    if (o) return o.is_blackout ? 'blocked' : 'custom';
    return activeWeekdays.has(dayNameOf(d)) ? 'weekly' : 'none';
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-brand-900">{MONTHS[viewMonth]} {viewYear}</h4>
          <div className="flex gap-1">
            <button type="button" onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1); }}
              className="p-1.5 rounded-md text-muted hover:bg-brand-50"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1); }}
              className="p-1.5 rounded-md text-muted hover:bg-brand-50"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-medium text-muted mb-1">
          {DAY_SHORT.map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {grid.map((d, i) => {
            if (!d) return <div key={`e-${i}`} />;
            const k = dateKey(d);
            const past = k < todayKey;
            const status = statusOf(d);
            const isSel = k === selDate;
            const dot = status === 'blocked' ? 'bg-red-500' : status === 'custom' ? 'bg-accent-500' : status === 'weekly' ? 'bg-emerald-500' : '';
            return (
              <div key={k} className="flex justify-center">
                <button type="button" disabled={past} onClick={() => { setSelDate(k); setErr(null); }}
                  className={cn('relative w-9 h-9 rounded-lg text-sm font-medium flex items-center justify-center transition-colors',
                    past ? 'text-muted/40 cursor-not-allowed' : isSel ? 'bg-brand-900 text-white' : 'text-brand-900 hover:bg-brand-50 border border-[--color-border]')}>
                  {d.getDate()}
                  {dot && !isSel && <span className={cn('absolute bottom-1 h-1 w-1 rounded-full', dot)} />}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> weekly</span>
          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-accent-500" /> custom</span>
          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" /> blocked</span>
        </p>
      </div>

      <div className="rounded-xl border border-[--color-border] p-4">
        {!selDate ? (
          <p className="text-sm text-muted">Pick a date to block it or set custom hours. Optional.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-brand-900">{selDate}</p>
            {sel ? (
              <>
                <p className="text-xs text-muted">
                  {sel.is_blackout ? 'Blocked for the day.' : `Custom hours: ${sel.start_time} - ${sel.end_time}`}
                </p>
                <Button type="button" size="sm" variant="outline" onClick={() => removeOverride(selDate)}>Remove override</Button>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-foreground">Custom hours</label>
                  <div className="flex items-center gap-1.5">
                    <input type="time" value={ovFrom} onChange={(e) => setOvFrom(e.target.value)}
                      className="h-9 px-2 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.12)] focus:outline-none" />
                    <span className="text-xs text-muted">-</span>
                    <input type="time" value={ovTo} onChange={(e) => setOvTo(e.target.value)}
                      className="h-9 px-2 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.12)] focus:outline-none" />
                  </div>
                  {err && <p className="text-xs text-red-600">{err}</p>}
                  <Button type="button" size="sm" variant="accent" onClick={() => setCustom(selDate)}>Set hours</Button>
                </div>
                <div className="border-t border-[--color-border] pt-3">
                  <Button type="button" size="sm" variant="outline" onClick={() => upsert({ slot_date: selDate, is_blackout: true })}
                    className="text-red-600 border-red-200 hover:bg-red-50">
                    <Ban className="h-3.5 w-3.5" /> Block this date
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
