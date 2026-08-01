'use client';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2, Wrench } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody } from './ui/Card';
import { AdminReferralCommissions } from './AdminReferrals';

// ── Types (mirror the backend admin payloads) ────────────────────────────────
interface MentorRef { display_name: string | null }
interface BookingRef {
  status: string | null; slot_time: string | null;
  candidate_name: string | null; candidate_email: string | null;
  mentors?: MentorRef | null;
}
interface Payout {
  id: string; booking_id: string; amount: number | null;
  net_amount_mentor_currency: number | null; mentor_currency: string | null;
  gross_amount: number | null; customer_currency: string | null;
  payout_state: string; method: string | null; payout_reference: string | null;
  paid_date: string | null; created_at: string;
  mentors?: MentorRef | null; bookings?: BookingRef | null;
}
interface Payment {
  id: string; booking_id: string; amount: number | null; currency: string | null;
  state: string; provider_payment_id: string | null; created_at: string;
  bookings?: BookingRef | null;
}

const PAYOUT_TONE: Record<string, 'brand' | 'accent' | 'neutral' | 'success' | 'warning'> = {
  pending: 'neutral', paid: 'success', void: 'neutral', blocked: 'warning',
};
const PAYMENT_TONE: Record<string, 'brand' | 'accent' | 'neutral' | 'success' | 'warning'> = {
  created: 'neutral', authorized: 'brand', captured: 'success',
  partially_refunded: 'warning', refunded: 'neutral', failed: 'warning',
};

function fmt(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function money(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null) return '-';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount} ${currency ?? ''}`.trim();
  }
}
// Money is multi-currency (each mentor is paid in their own currency), so totals are kept per currency.
function sumByCurrency<T>(items: T[], amt: (t: T) => number | null | undefined, ccy: (t: T) => string | null | undefined, keep?: (t: T) => boolean): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) {
    if (keep && !keep(it)) continue;
    const a = amt(it); const c = ccy(it);
    if (a == null || !c) continue;
    out[c] = (out[c] ?? 0) + a;
  }
  return out;
}
function moneyList(totals: Record<string, number>): string {
  const e = Object.entries(totals).filter(([, v]) => v);
  return e.length ? e.map(([c, v]) => money(v, c)).join('  ·  ') : '-';
}

export function AdminPayouts() {
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [mentor, setMentor] = useState('all');   // filter by mentor display_name

  const authedFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data: { session } } = await createClient().auth.getSession();
    return fetch(url, { ...init, headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${session?.access_token ?? ''}` }, cache: 'no-store' });
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [poRes, pmRes] = await Promise.all([authedFetch('/api/admin/payouts'), authedFetch('/api/admin/payments')]);
      if (!poRes.ok || !pmRes.ok) { setError('Could not load financials.'); return; }
      const po = await poRes.json();
      const pm = await pmRes.json();
      setConfigured(po.configured !== false && pm.configured !== false);
      setPayouts(po.payouts ?? []);
      setPayments(pm.payments ?? []);
    } catch { setError('Could not load financials.'); }
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

  const mentors = useMemo(() => {
    const s = new Set<string>();
    (payouts ?? []).forEach((p) => p.mentors?.display_name && s.add(p.mentors.display_name));
    (payments ?? []).forEach((p) => p.bookings?.mentors?.display_name && s.add(p.bookings.mentors.display_name));
    return Array.from(s).sort();
  }, [payouts, payments]);

  if (payouts === null || payments === null) {
    return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading financials…</div>;
  }

  if (!configured) {
    return (
      <Card><CardBody className="pt-10 pb-10 flex flex-col items-center text-center gap-2">
        <div className="h-11 w-11 rounded-full bg-brand-50 flex items-center justify-center text-brand-600"><Wrench className="h-5 w-5" /></div>
        <p className="text-base font-semibold text-foreground">Payments not set up yet</p>
        <p className="text-sm text-muted max-w-md">Turn on <code>platform_settings.payments_enabled</code> (see docs/PAYMENTS.md). Payouts and payments appear here once the first paid booking comes through.</p>
      </CardBody></Card>
    );
  }

  const poF = mentor === 'all' ? payouts : payouts.filter((p) => p.mentors?.display_name === mentor);
  const pmF = mentor === 'all' ? payments : payments.filter((p) => p.bookings?.mentors?.display_name === mentor);

  const owed = sumByCurrency(poF, (p) => p.net_amount_mentor_currency, (p) => p.mentor_currency, (p) => p.payout_state === 'pending');
  const paid = sumByCurrency(poF, (p) => p.net_amount_mentor_currency, (p) => p.mentor_currency, (p) => p.payout_state === 'paid');
  const earned = sumByCurrency(poF, (p) => p.net_amount_mentor_currency, (p) => p.mentor_currency);
  const collected = sumByCurrency(pmF, (p) => p.amount, (p) => p.currency, (p) => p.state === 'captured');
  const pendingCount = poF.filter((p) => p.payout_state === 'pending').length;

  return (
    <div className="flex flex-col gap-8">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Totals at the top (respect the mentor filter) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Owed to mentors" value={moneyList(owed)} hint={`${pendingCount} pending`} />
        <Kpi label="Paid to mentors" value={moneyList(paid)} />
        <Kpi label="Collected from customers" value={moneyList(collected)} />
        <Kpi label={mentor === 'all' ? 'Sessions' : 'Total earned'} value={mentor === 'all' ? String(poF.length) : moneyList(earned)} hint={mentor === 'all' ? undefined : `${poF.length} sessions`} />
      </div>

      {/* Mentor filter */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">Mentor</span>
        <select value={mentor} onChange={(e) => setMentor(e.target.value)}
          className="h-9 px-3 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none">
          <option value="all">All mentors ({mentors.length})</option>
          {mentors.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {mentor !== 'all' && (
          <span className="text-sm text-muted">{poF.length} session{poF.length === 1 ? '' : 's'} · earned {moneyList(earned)} · pending {moneyList(owed)}</span>
        )}
      </div>

      {/* Payouts as cards (past + present) */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-1">Mentor payouts</h2>
        <p className="text-sm text-muted mb-4">Each mentor&apos;s net per session. Made manually; mark one paid once the transfer is sent.</p>
        {poF.length === 0 ? <p className="text-sm text-muted">No payouts yet.</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {poF.map((p) => <PayoutCard key={p.id} p={p} busy={busy} onPay={markPaid} />)}
          </div>
        )}
      </section>

      {/* Customer payments as cards */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-1">Customer payments</h2>
        <p className="text-sm text-muted mb-4">Charges collected through Razorpay, newest first.</p>
        {pmF.length === 0 ? <p className="text-sm text-muted">No payments yet.</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {pmF.map((p) => <PaymentCard key={p.id} p={p} />)}
          </div>
        )}
      </section>

      {/* Referral commissions (promoter payouts) */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-1">Referral commissions</h2>
        <p className="text-sm text-muted mb-4">Promoter payouts from referral codes: who referred the customer, the discount, the split, and the commission owed. Approve/reject in the Referrals tab; mark paid here.</p>
        <AdminReferralCommissions />
      </section>
    </div>
  );
}

function PayoutCard({ p, busy, onPay }: { p: Payout; busy: string | null; onPay: (id: string) => void }) {
  const completed = p.bookings?.status === 'completed';
  const canPay = p.payout_state === 'pending' && completed;
  return (
    <Card><CardBody className="pt-4 pb-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{p.mentors?.display_name ?? '-'}</p>
          <p className="text-xs text-muted truncate">{fmt(p.bookings?.slot_time ?? null)} · {p.bookings?.candidate_name ?? p.bookings?.candidate_email ?? '-'}</p>
        </div>
        <Badge tone={PAYOUT_TONE[p.payout_state] ?? 'neutral'}>{p.payout_state}</Badge>
      </div>
      <div className="flex items-end justify-between gap-2 mt-1">
        <div>
          <p className="text-lg font-bold text-foreground">{money(p.net_amount_mentor_currency, p.mentor_currency)}</p>
          {p.payout_reference && <p className="text-xs text-muted">ref {p.payout_reference}</p>}
          {p.paid_date && <p className="text-xs text-muted">paid {fmt(p.paid_date)}</p>}
        </div>
        {p.payout_state === 'paid' ? <span className="text-xs text-muted">Paid</span>
          : canPay ? <Button size="sm" variant="accent" loading={busy === p.booking_id} onClick={() => onPay(p.booking_id)}>Mark paid</Button>
          : p.payout_state === 'pending' ? <span className="text-xs text-muted">Awaiting session</span>
          : null}
      </div>
    </CardBody></Card>
  );
}

function PaymentCard({ p }: { p: Payment }) {
  return (
    <Card><CardBody className="pt-4 pb-4 flex flex-col gap-1">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold text-foreground">{money(p.amount, p.currency)}</p>
          <p className="text-xs text-muted">{fmt(p.created_at)}</p>
        </div>
        <Badge tone={PAYMENT_TONE[p.state] ?? 'neutral'}>{p.state.replace('_', ' ')}</Badge>
      </div>
      <p className="text-sm text-foreground truncate">{p.bookings?.mentors?.display_name ?? '-'}</p>
      <p className="text-xs text-muted truncate">{p.bookings?.candidate_name ?? '-'}{p.bookings?.candidate_email ? ` · ${p.bookings.candidate_email}` : ''}</p>
    </CardBody></Card>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: ReactNode }) {
  return (
    <Card><CardBody className="pt-4 pb-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-bold text-foreground mt-0.5 break-words leading-tight">{value}</p>
      {hint && <p className="text-[11px] text-muted/70 mt-0.5">{hint}</p>}
    </CardBody></Card>
  );
}
