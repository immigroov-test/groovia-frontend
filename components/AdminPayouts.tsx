'use client';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Loader2, Wrench, ExternalLink } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody } from './ui/Card';

// ── Types (mirror the backend admin payloads) ────────────────────────────────
interface MentorRef { display_name: string | null }
interface BookingRef {
  status: string | null; slot_time: string | null;
  candidate_name: string | null; candidate_email: string | null;
  mentors?: MentorRef | null;
}
interface Payout {
  id: string; booking_id: string;
  net_amount_mentor_currency: number | null; mentor_currency: string | null;
  gross_amount: number | null; customer_currency: string | null;
  payout_state: string; payout_reference: string | null; paid_date: string | null; created_at: string;
  mentors?: MentorRef | null; bookings?: BookingRef | null;
}
interface Payment { id: string; amount: number | null; currency: string | null; state: string; }
interface LegacyRow {
  id: string; service_title: string | null; slot_start: string | null;
  amount_total: number | null; amount_currency: string | null;
  mentor_name: string | null; customer_name: string | null;
}

// One unified payment row (a live per-session payout OR a historical session earning).
interface Item {
  key: string; mentor: string; customer: string | null; date: string | null; service: string | null;
  net: number | null; netCcy: string | null; gross: number | null; grossCcy: string | null;
  status: string; bookingId: string | null; canPay: boolean;
}

const TONE: Record<string, 'brand' | 'accent' | 'neutral' | 'success' | 'warning'> = {
  pending: 'neutral', paid: 'success', void: 'neutral', blocked: 'warning', completed: 'success',
};

function fmt(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function money(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null) return '-';
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(amount); }
  catch { return `${amount} ${currency ?? ''}`.trim(); }
}
type Ccy = Record<string, number>;
function add(map: Ccy, ccy: string | null | undefined, amt: number | null | undefined) { if (amt != null && ccy) map[ccy] = (map[ccy] ?? 0) + amt; }
function moneyList(totals: Ccy): string {
  const e = Object.entries(totals).filter(([, v]) => v);
  return e.length ? e.map(([c, v]) => money(v, c)).join('  ·  ') : '';
}

export function AdminPayouts() {
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [legacy, setLegacy] = useState<LegacyRow[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [mentor, setMentor] = useState('all');

  const authedFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data: { session } } = await createClient().auth.getSession();
    return fetch(url, { ...init, headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${session?.access_token ?? ''}` }, cache: 'no-store' });
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [poRes, pmRes, lgRes] = await Promise.all([
        authedFetch('/api/admin/payouts'), authedFetch('/api/admin/payments'), authedFetch('/api/admin/legacy-sessions'),
      ]);
      if (!poRes.ok || !pmRes.ok) { setError('Could not load payments.'); return; }
      const po = await poRes.json();
      const pm = await pmRes.json();
      setConfigured(po.configured !== false && pm.configured !== false);
      setPayouts(po.payouts ?? []);
      setPayments(pm.payments ?? []);
      setLegacy(lgRes.ok ? await lgRes.json() : []);
    } catch { setError('Could not load payments.'); }
  }, [authedFetch]);

  useEffect(() => { load(); }, [load]);

  async function markPaid(bookingId: string) {
    setBusy(bookingId); setError(null);
    try {
      const res = await authedFetch(`/api/admin/payouts/${bookingId}/mark-paid`, { method: 'POST' });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.detail || 'Could not mark the payout as paid.'); return; }
      await load();
    } catch { setError('Could not mark the payout as paid.'); }
    finally { setBusy(null); }
  }

  // One seamless list of payments: live per-session payouts + historical session earnings, newest first.
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    (payouts ?? []).forEach((p) => out.push({
      key: `p${p.id}`, mentor: p.mentors?.display_name ?? '-',
      customer: p.bookings?.candidate_name ?? p.bookings?.candidate_email ?? null,
      date: p.bookings?.slot_time ?? p.created_at, service: null,
      net: p.net_amount_mentor_currency, netCcy: p.mentor_currency,
      gross: p.gross_amount, grossCcy: p.customer_currency,
      status: p.payout_state, bookingId: p.booking_id, canPay: p.payout_state === 'pending' && p.bookings?.status === 'completed',
    }));
    (legacy ?? []).forEach((r) => out.push({
      key: `l${r.id}`, mentor: r.mentor_name ?? '-', customer: r.customer_name,
      date: r.slot_start, service: r.service_title,
      net: null, netCcy: null, gross: r.amount_total, grossCcy: r.amount_currency,
      status: 'completed', bookingId: null, canPay: false,
    }));
    return out.sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
  }, [payouts, legacy]);

  if (payouts === null || payments === null || legacy === null) {
    return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading payments…</div>;
  }
  if (!configured && items.length === 0) {
    return (
      <Card><CardBody className="pt-10 pb-10 flex flex-col items-center text-center gap-2">
        <div className="h-11 w-11 rounded-full bg-brand-50 flex items-center justify-center text-brand-600"><Wrench className="h-5 w-5" /></div>
        <p className="text-base font-semibold text-foreground">Payments not set up yet</p>
        <p className="text-sm text-muted max-w-md">Turn on <code>platform_settings.payments_enabled</code> (see docs/PAYMENTS.md). Payments appear here once the first paid booking comes through.</p>
      </CardBody></Card>
    );
  }

  const mentorNames = Array.from(new Set(items.map((i) => i.mentor))).sort();
  const shown = mentor === 'all' ? items : items.filter((i) => i.mentor === mentor);

  const owed: Ccy = {}, paid: Ccy = {};
  let pending = 0, done = 0;
  shown.forEach((i) => {
    if (i.status === 'pending') { add(owed, i.netCcy, i.net); pending++; }
    if (i.status === 'paid') { add(paid, i.netCcy, i.net); done++; }
  });

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Clean count tiles; money lives on the cards + as small hints (never a giant multi-currency number) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Payments" value={String(shown.length)} />
        <Kpi label="Owed to mentors" value={String(pending)} hint={moneyList(owed)} />
        <Kpi label="Paid to mentors" value={String(done)} hint={moneyList(paid)} />
        <Kpi label="Mentors" value={mentor === 'all' ? String(mentorNames.length) : '1'} />
      </div>

      {/* Mentor filter */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">Mentor</span>
        <select value={mentor} onChange={(e) => setMentor(e.target.value)}
          className="h-9 px-3 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none max-w-full">
          <option value="all">All mentors ({mentorNames.length})</option>
          {mentorNames.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Card per payment */}
      {shown.length === 0 ? <p className="text-sm text-muted">No payments.</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {shown.map((i) => <PaymentCard key={i.key} i={i} busy={busy} onPay={markPaid} />)}
        </div>
      )}
    </div>
  );
}

function PaymentCard({ i, busy, onPay }: { i: Item; busy: string | null; onPay: (id: string) => void }) {
  return (
    <Card><CardBody className="pt-4 pb-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{i.mentor}</p>
          <p className="text-xs text-muted truncate">{fmt(i.date)}{i.customer ? ` · ${i.customer}` : ''}{i.service ? ` · ${i.service}` : ''}</p>
        </div>
        <Badge tone={TONE[i.status] ?? 'neutral'}>{i.status}</Badge>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-sm min-w-0">
          {i.net != null
            ? <><p className="text-foreground"><span className="text-muted">Net </span><b className="text-base">{money(i.net, i.netCcy)}</b></p>
                <p className="text-xs text-muted">Customer paid {money(i.gross, i.grossCcy)}</p></>
            : <p className="text-foreground"><b className="text-base">{money(i.gross, i.grossCcy)}</b></p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {i.bookingId && (
            <Link href={`/session/${i.bookingId}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
              Booking <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
          {i.canPay && <Button size="sm" variant="accent" loading={busy === i.bookingId} onClick={() => i.bookingId && onPay(i.bookingId)}>Mark paid</Button>}
        </div>
      </div>
    </CardBody></Card>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: ReactNode }) {
  return (
    <Card><CardBody className="pt-4 pb-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-0.5 leading-none">{value}</p>
      {hint ? <p className="text-[11px] text-muted/70 mt-1 break-words">{hint}</p> : null}
    </CardBody></Card>
  );
}
