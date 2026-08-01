'use client';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2, Search } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';

interface Booking {
  id: string; status: string; slot_time: string | null;
  candidate_name: string | null; candidate_email: string | null;
  mentor_name: string | null; reschedule_count: number; no_show_by: string | null; created_at: string;
}
interface Detail extends Booking {
  requests?: { kind: string; initiated_by: string; status: string; respond_by: string | null; created_at: string }[];
  offers?: { status: string; was_late: boolean; created_at: string }[];
}
interface LegacyRow {
  id: string; status: string | null; service_title: string | null; customer_name: string | null;
  slot_start: string | null; duration_min: number | null; amount_total: number | null;
  amount_currency: string | null; mentor_name: string | null;
}

type View = 'live' | 'past';

// Status "buckets" shown as count-cards (also act as filters). 'upcoming' = confirmed|rescheduled.
const GROUPS: [string, string][] = [
  ['all', 'All'], ['upcoming', 'Upcoming'], ['completed', 'Completed'],
  ['cancelled', 'Cancelled'], ['no_show', 'No-show'], ['pending', 'Awaiting payment'],
];
const TONE: Record<string, 'brand' | 'accent' | 'neutral' | 'success' | 'warning'> = {
  confirmed: 'brand', rescheduled: 'accent', completed: 'success', cancelled: 'neutral', no_show: 'warning', pending: 'warning',
};
const STATUS_LABEL: Record<string, string> = { pending: 'awaiting payment' };

function fmt(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function money(total?: number | null, currency?: string | null): string {
  if (!total || !currency) return '';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(total); }
  catch { return `${total} ${currency}`; }
}
function inGroup(status: string, group: string): boolean {
  if (group === 'all') return true;
  if (group === 'upcoming') return status === 'confirmed' || status === 'rescheduled';
  return status === group;
}

export function AdminBookings() {
  const [view, setView] = useState<View>('live');
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [pastRows, setPastRows] = useState<LegacyRow[] | null>(null);
  const [group, setGroup] = useState('all');
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, Detail | null>>({});

  const authedFetch = useCallback(async (url: string) => {
    const { data: { session } } = await createClient().auth.getSession();
    return fetch(url, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, cache: 'no-store' });
  }, []);

  // Load the full set once per view; status + search are applied client-side (instant, and lets the
  // count-cards stay accurate regardless of the active filter).
  const load = useCallback(async () => {
    setError(null);
    try {
      if (view === 'live') {
        setRows(null);
        const res = await authedFetch('/api/admin/bookings');
        if (!res.ok) { setError('Could not load.'); return; }
        setRows(await res.json());
      } else {
        setPastRows(null);
        const res = await authedFetch('/api/admin/legacy-sessions');
        if (!res.ok) { setError('Could not load.'); return; }
        setPastRows(await res.json());
      }
    } catch { setError('Could not load.'); }
  }, [authedFetch, view]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, upcoming: 0, completed: 0, cancelled: 0, no_show: 0, pending: 0 };
    (rows ?? []).forEach((b) => { c.all++; if (b.status === 'confirmed' || b.status === 'rescheduled') c.upcoming++; else if (c[b.status] !== undefined) c[b.status]++; });
    return c;
  }, [rows]);

  async function toggle(id: string) {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    if (details[id] !== undefined) return;
    try {
      const res = await authedFetch(`/api/admin/bookings/${id}`);
      const data = res.ok ? await res.json() : null;
      setDetails((d) => ({ ...d, [id]: data }));
    } catch { setDetails((d) => ({ ...d, [id]: null })); }
  }

  const term = q.trim().toLowerCase();
  const live = (rows ?? []).filter((b) => inGroup(b.status, group)
    && (!term || [b.mentor_name, b.candidate_name, b.candidate_email].some((x) => x?.toLowerCase().includes(term))));
  const past = (pastRows ?? []).filter((s) => !term || [s.mentor_name, s.customer_name, s.service_title].some((x) => x?.toLowerCase().includes(term)));

  return (
    <div className="flex flex-col gap-4">
      {/* Live vs. imported past sessions */}
      <div className="flex flex-wrap gap-2">
        {([['live', 'Live bookings'], ['past', 'Past sessions']] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setView(key)}
            className={cn('rounded-full px-3 py-1 text-sm font-medium border transition-colors',
              view === key ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-[--color-border] text-muted hover:text-foreground')}>
            {label}
          </button>
        ))}
      </div>

      {/* Status count-cards (live) - click to filter */}
      {view === 'live' && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {GROUPS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setGroup(key)}
              className={cn('rounded-xl border px-3 py-2 text-left transition-colors',
                group === key ? 'border-brand-600 bg-brand-50' : 'border-[--color-border] hover:bg-brand-50/40')}>
              <p className="text-xl font-bold text-foreground leading-none">{counts[key] ?? 0}</p>
              <p className="text-[11px] text-muted mt-1">{label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Search (client-side, instant) */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={view === 'live' ? 'Search mentor or mentee name/email…' : 'Search mentor or customer name…'}
          className="w-full h-10 pl-9 pr-3 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {view === 'live' ? (
        rows === null ? (
          <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading bookings…</div>
        ) : live.length === 0 ? (
          <p className="text-sm text-muted">No bookings match.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[--color-border]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted border-b border-[--color-border]">
                  <th className="px-4 py-2.5 font-medium">When</th>
                  <th className="px-4 py-2.5 font-medium">Mentor</th>
                  <th className="px-4 py-2.5 font-medium">Mentee</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium sr-only">Open</th>
                </tr>
              </thead>
              <tbody>
                {live.map((b) => (
                  <Fragment key={b.id}>
                    <tr onClick={() => toggle(b.id)} className="border-b border-[--color-border] last:border-0 hover:bg-brand-50/50 cursor-pointer">
                      <td className="px-4 py-2.5 whitespace-nowrap text-foreground">{fmt(b.slot_time)}</td>
                      <td className="px-4 py-2.5 text-foreground">{b.mentor_name ?? '-'}</td>
                      <td className="px-4 py-2.5 min-w-0"><span className="text-foreground">{b.candidate_name ?? '-'}</span><span className="block text-xs text-muted truncate">{b.candidate_email}</span></td>
                      <td className="px-4 py-2.5">
                        <Badge tone={TONE[b.status] ?? 'neutral'}>{STATUS_LABEL[b.status] ?? b.status.replace('_', ' ')}</Badge>
                        {b.reschedule_count > 0 && <span className="text-xs text-muted ml-1.5">· resched {b.reschedule_count}×</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <Link href={`/session/${b.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                          Open <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                    {openId === b.id && (
                      <tr className="bg-brand-50/30 border-b border-[--color-border]">
                        <td colSpan={5} className="px-4 py-3">
                          {details[b.id] === undefined ? <span className="text-xs text-muted">Loading…</span>
                            : details[b.id] === null ? <span className="text-xs text-red-600">Could not load details.</span>
                            : (
                              <div className="flex flex-col gap-2 text-xs text-muted">
                                <div className="flex flex-wrap gap-x-6 gap-y-1">
                                  <span>Booked <b className="text-foreground">{fmt(b.created_at)}</b></span>
                                  {b.no_show_by && <span>No-show by <b className="text-foreground">{b.no_show_by}</b></span>}
                                  <span>Booking ID <code>{b.id}</code></span>
                                </div>
                                {(details[b.id]?.requests?.length ?? 0) > 0 && (
                                  <div>
                                    <p className="font-medium text-foreground mb-1">Requests</p>
                                    {details[b.id]!.requests!.map((r, i) => (
                                      <p key={i}>· {r.kind} by {r.initiated_by} - <b className="text-foreground">{r.status}</b> {r.respond_by ? `(respond by ${fmt(r.respond_by)})` : ''}</p>
                                    ))}
                                  </div>
                                )}
                                {(details[b.id]?.offers?.length ?? 0) > 0 && (
                                  <div>
                                    <p className="font-medium text-foreground mb-1">Reschedule offers</p>
                                    {details[b.id]!.offers!.map((o, i) => (
                                      <p key={i}>· offer - <b className="text-foreground">{o.status}</b>{o.was_late ? ' (late)' : ''}</p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        pastRows === null ? (
          <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading past sessions…</div>
        ) : past.length === 0 ? (
          <p className="text-sm text-muted">No past sessions match. (Imported from the old portal, read-only.)</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[--color-border]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted border-b border-[--color-border]">
                  <th className="px-4 py-2.5 font-medium">When</th>
                  <th className="px-4 py-2.5 font-medium">Mentor</th>
                  <th className="px-4 py-2.5 font-medium">Customer</th>
                  <th className="px-4 py-2.5 font-medium">Session</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {past.map((s) => (
                  <tr key={s.id} className="border-b border-[--color-border] last:border-0">
                    <td className="px-4 py-2.5 whitespace-nowrap text-foreground">{fmt(s.slot_start)}</td>
                    <td className="px-4 py-2.5 text-foreground">{s.mentor_name ?? '-'}</td>
                    <td className="px-4 py-2.5 text-foreground">{s.customer_name ?? '-'}</td>
                    <td className="px-4 py-2.5 min-w-0">
                      <span className="text-foreground">{s.service_title ?? 'Session'}</span>
                      <span className="block text-xs text-muted">{[s.duration_min ? `${s.duration_min} min` : '', money(s.amount_total, s.amount_currency)].filter(Boolean).join(' · ')}</span>
                    </td>
                    <td className="px-4 py-2.5">{s.status && <Badge tone={TONE[s.status] ?? 'neutral'}>{s.status.replace(/_/g, ' ')}</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
