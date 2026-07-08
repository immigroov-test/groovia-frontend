'use client';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Badge } from './ui/Badge';

interface Booking {
  id: string; status: string; slot_time: string | null;
  candidate_name: string | null; candidate_email: string | null;
  mentor_name: string | null; reschedule_count: number; no_show_by: string | null; created_at: string;
}
interface Detail extends Booking {
  requests?: { kind: string; initiated_by: string; status: string; respond_by: string | null; created_at: string }[];
  offers?: { status: string; was_late: boolean; created_at: string }[];
}

const STATUSES = ['confirmed', 'rescheduled', 'completed', 'cancelled', 'no_show', 'pending'];
const TONE: Record<string, 'brand' | 'accent' | 'neutral' | 'success' | 'warning'> = {
  confirmed: 'brand', rescheduled: 'accent', completed: 'success', cancelled: 'neutral', no_show: 'warning', pending: 'neutral',
};

function fmt(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function AdminBookings() {
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, Detail | null>>({});

  const authedFetch = useCallback(async (url: string) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return fetch(url, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, cache: 'no-store' });
  }, []);

  const load = useCallback(async () => {
    setError(null); setRows(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (q.trim()) params.set('q', q.trim());
      const res = await authedFetch(`/api/admin/bookings?${params.toString()}`);
      if (!res.ok) { setError('Could not load bookings.'); return; }
      setRows(await res.json());
    } catch { setError('Could not load bookings.'); }
  }, [authedFetch, status, q]);

  // Reload when the status filter changes (search is submitted explicitly).
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status]);

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

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="h-10 px-3 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mentee email or name…"
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none" />
        </form>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {rows === null ? (
        <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading bookings…</div>
      ) : rows.length === 0 ? (
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
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <Fragment key={b.id}>
                  <tr onClick={() => toggle(b.id)}
                    className="border-b border-[--color-border] last:border-0 hover:bg-brand-50/50 cursor-pointer">
                    <td className="px-4 py-2.5 whitespace-nowrap text-foreground">{fmt(b.slot_time)}</td>
                    <td className="px-4 py-2.5 text-foreground">{b.mentor_name ?? '-'}</td>
                    <td className="px-4 py-2.5 min-w-0"><span className="text-foreground">{b.candidate_name ?? '-'}</span><span className="block text-xs text-muted truncate">{b.candidate_email}</span></td>
                    <td className="px-4 py-2.5">
                      <Badge tone={TONE[b.status] ?? 'neutral'}>{b.status.replace('_', ' ')}</Badge>
                      {b.reschedule_count > 0 && <span className="text-xs text-muted ml-1.5">· resched {b.reschedule_count}×</span>}
                    </td>
                  </tr>
                  {openId === b.id && (
                    <tr className="bg-brand-50/30 border-b border-[--color-border]">
                      <td colSpan={4} className="px-4 py-3">
                        {details[b.id] === undefined ? (
                          <span className="text-xs text-muted">Loading…</span>
                        ) : details[b.id] === null ? (
                          <span className="text-xs text-red-600">Could not load details.</span>
                        ) : (
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
      )}
    </div>
  );
}
