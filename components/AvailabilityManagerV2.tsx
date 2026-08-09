'use client';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, X, Ban, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardBody } from './ui/Card';
import { cn } from '../lib/utils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
type Day = typeof DAYS[number];

interface WeeklySlot { id: string; weekday: string; start_time: string; end_time: string; timezone: string; }
interface SpecificSlot { id: string; slot_date: string; start_time: string | null; end_time: string | null; timezone: string; is_booked: boolean; is_blackout: boolean; }
interface Rules { days_ahead: number; min_notice_hours: number; cancel_hours: number; timezone: string; }

async function apiFetch(path: string, method = 'GET', body?: object) {
  const supabase = (await import('../lib/supabase/client')).createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

const API = '/api/mentor/availability-v2';
const hhmm = (t?: string | null) => (t ?? '').slice(0, 5);
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// JS getDay(): 0=Sun..6=Sat → our Monday-first day name.
const dayNameOf = (d: Date) => DAYS[(d.getDay() + 6) % 7];

export function AvailabilityManagerV2() {
  const [weekly, setWeekly] = useState<WeeklySlot[]>([]);
  const [specific, setSpecific] = useState<SpecificSlot[]>([]);
  const [rulesForm, setRulesForm] = useState<Rules | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-day "add hours" inline editor
  const [addDay, setAddDay] = useState<Day | null>(null);
  const [addFrom, setAddFrom] = useState('09:00');
  const [addTo, setAddTo] = useState('17:00');
  const [busy, setBusy] = useState(false);

  // Booking rules
  const [savingRules, setSavingRules] = useState(false);

  // Calendar / overrides
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selDate, setSelDate] = useState<string | null>(null);
  const [ovFrom, setOvFrom] = useState('09:00');
  const [ovTo, setOvTo] = useState('17:00');

  async function load() {
    setLoading(true); setError(null);
    try {
      const [w, s, r] = await Promise.all([apiFetch(`${API}/weekly`), apiFetch(`${API}/specific`), apiFetch(`${API}/rules`)]);
      setWeekly(w ?? []); setSpecific(s ?? []); setRulesForm(r);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const weeklyByDay = useMemo(() => {
    const m: Record<string, WeeklySlot[]> = {};
    for (const d of DAYS) m[d] = weekly.filter((s) => s.weekday === d).sort((a, b) => a.start_time.localeCompare(b.start_time));
    return m;
  }, [weekly]);

  const daysWithHours = useMemo(() => new Set(weekly.map((s) => s.weekday)), [weekly]);
  const specByDate = useMemo(() => {
    const m = new Map<string, SpecificSlot>();
    for (const s of specific) m.set(s.slot_date, s);
    return m;
  }, [specific]);

  function statusOf(d: Date): 'blocked' | 'custom' | 'weekly' | 'none' {
    const sp = specByDate.get(dateKey(d));
    if (sp) return sp.is_blackout ? 'blocked' : 'custom';
    return daysWithHours.has(dayNameOf(d)) ? 'weekly' : 'none';
  }

  async function addHours(day: Day) {
    if (addTo <= addFrom) { setError('End must be after start.'); return; }
    setBusy(true); setError(null);
    try {
      await apiFetch(`${API}/weekly`, 'POST', { weekday: day, start_time: addFrom, end_time: addTo });
      setAddDay(null); await load();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  async function delWeekly(id: string) {
    try { await apiFetch(`${API}/weekly/${id}/delete`, 'POST'); setWeekly((w) => w.filter((s) => s.id !== id)); }
    catch (e: any) { setError(e.message); }
  }
  async function saveRules() {
    if (!rulesForm) return;
    const { days_ahead, min_notice_hours, cancel_hours } = rulesForm;
    if (!(days_ahead >= 1 && days_ahead <= 90)) { setError('Book up to must be between 1 and 90 days ahead.'); return; }
    if (!(min_notice_hours >= 2 && min_notice_hours <= 24)) { setError('Minimum booking notice must be between 2 and 24 hours.'); return; }
    if (!(cancel_hours >= 2 && cancel_hours <= 48)) { setError('Cancellation / rescheduling time must be between 2 and 48 hours.'); return; }
    setSavingRules(true); setError(null);
    try {
      await apiFetch(`${API}/rules`, 'POST', {
        days_ahead: rulesForm.days_ahead, min_notice_hours: rulesForm.min_notice_hours, cancel_hours: rulesForm.cancel_hours,
      });
    } catch (e: any) { setError(e.message); } finally { setSavingRules(false); }
  }
  async function blockDate(date: string) {
    try { await apiFetch(`${API}/block-date`, 'POST', { slot_date: date }); setSelDate(null); await load(); }
    catch (e: any) { setError(e.message); }
  }
  async function overrideDate(date: string) {
    if (ovTo <= ovFrom) { setError('End must be after start.'); return; }
    try { await apiFetch(`${API}/override-date`, 'POST', { slot_date: date, start_time: ovFrom, end_time: ovTo }); setSelDate(null); await load(); }
    catch (e: any) { setError(e.message); }
  }
  async function delSpecific(id: string) {
    try { await apiFetch(`${API}/specific/${id}/delete`, 'POST'); setSpecific((s) => s.filter((x) => x.id !== id)); }
    catch (e: any) { setError(e.message); }
  }

  // Month grid (Monday-first)
  const grid = useMemo(() => {
    const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (Date | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);
  const todayKey = dateKey(now);

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted py-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading availability…</div>;

  const tz = rulesForm?.timezone ?? 'UTC';
  const selStatus = selDate ? specByDate.get(selDate) : undefined;

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* ── Weekly hours ─────────────────────────────────────────── */}
      <Card>
        <CardBody className="pt-5">
          <h3 className="text-base font-semibold text-brand-900">Weekly hours <span className="text-xs font-normal text-muted">· {tz}</span></h3>
          <div className="mt-4 flex flex-col divide-y divide-[--color-border]">
            {DAYS.map((day, i) => (
              <div key={day} className="flex flex-wrap items-center gap-2 py-3">
                <span className="w-12 text-sm font-semibold text-brand-900 shrink-0">{DAY_SHORT[i]}</span>
                <div className="flex flex-wrap items-center gap-1.5 flex-1">
                  {weeklyByDay[day].length === 0 && addDay !== day && (
                    <span className="text-sm text-muted">Unavailable</span>
                  )}
                  {weeklyByDay[day].map((slot) => (
                    <span key={slot.id} className="inline-flex items-center gap-1 bg-brand-50 text-brand-800 rounded-full pl-2.5 pr-1.5 py-1 text-xs font-medium">
                      {hhmm(slot.start_time)}-{hhmm(slot.end_time)}
                      <button onClick={() => delWeekly(slot.id)} aria-label="Remove" className="text-brand-400 hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {addDay === day ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <input type="time" value={addFrom} onChange={(e) => setAddFrom(e.target.value)}
                      className="h-8 px-2 rounded-lg bg-white text-xs shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none" />
                    <span className="text-xs text-muted">-</span>
                    <input type="time" value={addTo} onChange={(e) => setAddTo(e.target.value)}
                      className="h-8 px-2 rounded-lg bg-white text-xs shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none" />
                    <Button size="sm" variant="accent" loading={busy} onClick={() => addHours(day)}>Add</Button>
                    <button onClick={() => setAddDay(null)} className="text-xs text-muted hover:text-foreground px-1">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => { setAddDay(day); setError(null); }}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-[--color-border] text-xs font-medium text-muted hover:text-foreground hover:border-brand-300 transition-colors shrink-0">
                    <Plus className="h-3.5 w-3.5" /> Add hours
                  </button>
                )}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* ── Booking rules ────────────────────────────────────────── */}
      {rulesForm && (
        <Card>
          <CardBody className="pt-5">
            <h3 className="text-base font-semibold text-brand-900">Booking rules</h3>
            <p className="text-xs text-muted mt-1 max-w-xl">
              How far ahead mentees can book, how much warning you need before a session, and how late a
              session can be cancelled. Example: a minimum booking notice of 2 means the soonest bookable
              slot is 2 hours from now.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <RuleField label="Book up to (days ahead, 1-90)" value={rulesForm.days_ahead} min={1} max={90}
                error={rulesForm.days_ahead >= 1 && rulesForm.days_ahead <= 90 ? undefined : 'Enter 1-90 days.'}
                onChange={(v) => setRulesForm((r) => r ? { ...r, days_ahead: v || 30 } : r)} />
              <RuleField label="Minimum booking notice (hrs, 2-24)" value={rulesForm.min_notice_hours} min={2} max={24} step={0.5}
                error={rulesForm.min_notice_hours >= 2 && rulesForm.min_notice_hours <= 24 ? undefined : 'Enter 2-24 hours.'}
                onChange={(v) => setRulesForm((r) => r ? { ...r, min_notice_hours: v || 0 } : r)} />
              <RuleField label="Cancellation / rescheduling time (hrs, 2-48)" value={rulesForm.cancel_hours} min={2} max={48}
                error={rulesForm.cancel_hours >= 2 && rulesForm.cancel_hours <= 48 ? undefined : 'Enter 2-48 hours.'}
                onChange={(v) => setRulesForm((r) => r ? { ...r, cancel_hours: v || 24 } : r)} />
              <Button variant="accent" onClick={saveRules} loading={savingRules} className="h-11"
                disabled={!(rulesForm.days_ahead >= 1 && rulesForm.days_ahead <= 90
                  && rulesForm.min_notice_hours >= 2 && rulesForm.min_notice_hours <= 24
                  && rulesForm.cancel_hours >= 2 && rulesForm.cancel_hours <= 48)}>Save rules</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Date overrides ───────────────────────────────────────── */}
      <Card>
        <CardBody className="pt-5">
          <h3 className="text-base font-semibold text-brand-900">Date overrides</h3>
          <p className="text-xs text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            Tap a date to block it or set custom hours.
            <span className="inline-flex items-center gap-1"><Dot c="bg-emerald-500" /> weekly</span>
            <span className="inline-flex items-center gap-1"><Dot c="bg-accent-500" /> custom</span>
            <span className="inline-flex items-center gap-1"><Dot c="bg-red-500" /> blocked</span>
          </p>

          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_300px]">
            {/* Calendar */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-brand-900">{MONTHS[viewMonth]} {viewYear}</h4>
                <div className="flex gap-1">
                  <button onClick={() => { const m = viewMonth === 0 ? 11 : viewMonth - 1; if (viewMonth === 0) setViewYear((y) => y - 1); setViewMonth(m); }}
                    className="p-1.5 rounded-md text-muted hover:bg-brand-50"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={() => { const m = viewMonth === 11 ? 0 : viewMonth + 1; if (viewMonth === 11) setViewYear((y) => y + 1); setViewMonth(m); }}
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
                  const sel = k === selDate;
                  const dotColor = status === 'blocked' ? 'bg-red-500' : status === 'custom' ? 'bg-accent-500' : status === 'weekly' ? 'bg-emerald-500' : '';
                  return (
                    <div key={k} className="flex justify-center">
                      <button type="button" disabled={past} onClick={() => { setSelDate(k); setError(null); }}
                        className={cn('relative w-9 h-9 rounded-lg text-sm font-medium flex flex-col items-center justify-center transition-colors',
                          past ? 'text-muted/40 cursor-not-allowed' : sel ? 'bg-brand-900 text-white' : 'text-brand-900 hover:bg-brand-50 border border-[--color-border]')}>
                        {d.getDate()}
                        {dotColor && !sel && <span className={cn('absolute bottom-1 h-1 w-1 rounded-full', dotColor)} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected-date actions */}
            <div className="rounded-xl border border-[--color-border] p-4">
              {!selDate ? (
                <p className="text-sm text-muted">Pick a date to block it or set custom hours.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-semibold text-brand-900">{selDate}</p>
                  {selStatus?.is_booked ? (
                    <p className="text-xs text-muted">This date has a booking and can&apos;t be changed here.</p>
                  ) : selStatus ? (
                    <>
                      <p className="text-xs text-muted">
                        {selStatus.is_blackout ? 'Blocked for the day.' : `Custom hours: ${hhmm(selStatus.start_time)}-${hhmm(selStatus.end_time)}`}
                      </p>
                      <Button size="sm" variant="outline" onClick={() => delSpecific(selStatus.id)}>Remove override</Button>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-foreground">Custom hours</label>
                        <div className="flex items-center gap-1.5">
                          <input type="time" value={ovFrom} onChange={(e) => setOvFrom(e.target.value)}
                            className="h-9 px-2 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none" />
                          <span className="text-xs text-muted">-</span>
                          <input type="time" value={ovTo} onChange={(e) => setOvTo(e.target.value)}
                            className="h-9 px-2 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none" />
                        </div>
                        <Button size="sm" variant="accent" onClick={() => overrideDate(selDate)}>Set hours</Button>
                      </div>
                      <div className="border-t border-[--color-border] pt-3">
                        <Button size="sm" variant="outline" onClick={() => blockDate(selDate)} className="text-red-600 border-red-200 hover:bg-red-50">
                          <Ban className="h-3.5 w-3.5" /> Block this date
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function RuleField({ label, value, onChange, min, max, step, error }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted">{label}</label>
      <input type="number" value={value} min={min} max={max} step={step} aria-invalid={!!error}
        onChange={(e) => onChange(step ? parseFloat(e.target.value) : parseInt(e.target.value))}
        className={`h-11 w-40 px-3 rounded-xl bg-white text-sm focus:outline-none ${error ? 'shadow-[0_0_0_1.5px_rgba(220,38,38,0.6)]' : 'shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]'}`} />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return <span className={cn('h-1.5 w-1.5 rounded-full', c)} />;
}
