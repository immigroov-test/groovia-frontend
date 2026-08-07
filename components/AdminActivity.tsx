'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';

interface AuditEvent {
  id: number;
  occurred_at: string;
  entity_type: string;
  entity_id: string | null;
  booking_id: string | null;
  action: string;
  actor: string | null;
  summary: string | null;
  details: Record<string, unknown> | null;
}

const ENTITY_TABS: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'booking', label: 'Bookings' },
  { key: 'payment', label: 'Payments' },
  { key: 'payout', label: 'Payouts' },
  { key: 'ledger', label: 'Money ledger' },
  { key: 'commission', label: 'Referral commission' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'settings', label: 'Settings' },
];

// Colour per entity so the timeline scans quickly.
const ENTITY_TONE: Record<string, string> = {
  booking: 'bg-brand-50 text-brand-700',
  payment: 'bg-emerald-50 text-emerald-700',
  payout: 'bg-amber-50 text-amber-700',
  ledger: 'bg-slate-100 text-slate-700',
  commission: 'bg-violet-50 text-violet-700',
  pricing: 'bg-sky-50 text-sky-700',
  settings: 'bg-neutral-100 text-neutral-700',
};

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export function AdminActivity() {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entity, setEntity] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [query, setQuery] = useState('');   // committed booking-id filter
  const [expanded, setExpanded] = useState<number | null>(null);

  const authedFetch = useCallback(async (url: string) => {
    const { data: { session } } = await createClient().auth.getSession();
    return fetch(url, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, cache: 'no-store' });
  }, []);

  const load = useCallback(async () => {
    setError(null); setEvents(null);
    const params = new URLSearchParams();
    if (entity) params.set('entity_type', entity);
    if (query.trim()) params.set('booking_id', query.trim());
    params.set('limit', '300');
    try {
      const res = await authedFetch(`/api/admin/audit?${params.toString()}`);
      if (!res.ok) { setError('Could not load activity.'); setEvents([]); return; }
      const d = await res.json();
      setEvents(d.events ?? []);
    } catch { setError('Could not load activity.'); setEvents([]); }
  }, [authedFetch, entity, query]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Everything that happens on the platform, newest first: bookings and status changes, payments,
        payouts, every money-ledger movement, referral commissions, and pricing / commission changes.
        Filter by a booking id to trace one booking end to end.
      </p>

      {/* Entity filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {ENTITY_TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setEntity(t.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              entity === t.key ? 'bg-brand-900 text-white' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Booking-id trace */}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Trace a booking id</span>
          <input value={bookingId} onChange={(e) => setBookingId(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setQuery(bookingId); }}
            placeholder="Paste a booking id"
            className="h-9 w-72 max-w-full px-2 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none" />
        </label>
        <Button variant="outline" size="sm" onClick={() => setQuery(bookingId)}><Search className="h-4 w-4" /> Filter</Button>
        {query && <Button variant="ghost" size="sm" onClick={() => { setBookingId(''); setQuery(''); }}>Clear</Button>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {events === null ? (
        <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted">No activity{query ? ' for this booking' : ''} yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {events.map((e) => {
            const tone = ENTITY_TONE[e.entity_type] ?? 'bg-neutral-100 text-neutral-700';
            const open = expanded === e.id;
            const hasDetails = e.details && Object.keys(e.details).length > 0;
            return (
              <Card key={e.id}><CardBody className="py-3">
                <div className="flex items-start gap-3">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{e.entity_type}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground break-words">{e.summary ?? e.action}</p>
                    <p className="text-[11px] text-muted mt-0.5">
                      {fmtTime(e.occurred_at)}
                      {e.actor && e.actor !== 'system' && <> · {e.actor}</>}
                      {e.booking_id && <> · booking {e.booking_id.slice(0, 8)}</>}
                    </p>
                  </div>
                  {hasDetails && (
                    <button type="button" onClick={() => setExpanded(open ? null : e.id)}
                      className="shrink-0 text-xs font-medium text-brand-700 hover:underline">
                      {open ? 'Hide' : 'Details'}
                    </button>
                  )}
                </div>
                {open && hasDetails && (
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-50 p-2 text-[11px] text-neutral-700">
                    {JSON.stringify(e.details, null, 2)}
                  </pre>
                )}
              </CardBody></Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
