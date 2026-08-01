'use client';
import { useCallback, useEffect, useState } from 'react';
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
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
  } catch {
    return `${amount} ${currency ?? ''}`.trim();
  }
}

// Imported historical sessions from the old portal. We only have the gross customer-paid amount
// (the old net/commission split isn't available), so this is a gross earnings view per mentor.
interface LegacyEarning {
  mentor_name: string | null; amount_total: number | null; amount_currency: string | null;
}
function aggregateEarnings(rows: LegacyEarning[]): { mentor: string; count: number; totals: Record<string, number> }[] {
  const byMentor = new Map<string, { mentor: string; count: number; totals: Record<string, number> }>();
  for (const r of rows) {
    const key = r.mentor_name ?? '-';
    const g = byMentor.get(key) ?? { mentor: key, count: 0, totals: {} };
    g.count += 1;
    if (r.amount_total && r.amount_currency) g.totals[r.amount_currency] = (g.totals[r.amount_currency] ?? 0) + r.amount_total;
    byMentor.set(key, g);
  }
  return Array.from(byMentor.values()).sort((a, b) => b.count - a.count);
}

export function AdminPayouts() {
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [legacy, setLegacy] = useState<LegacyEarning[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);   // booking_id being acted on

  const authedFetch = useCallback(async (url: string, init?: RequestInit) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return fetch(url, {
      ...init,
      headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${session?.access_token ?? ''}` },
      cache: 'no-store',
    });
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [poRes, pmRes, lgRes] = await Promise.all([
        authedFetch('/api/admin/payouts'),
        authedFetch('/api/admin/payments'),
        authedFetch('/api/admin/legacy-sessions'),
      ]);
      if (!poRes.ok || !pmRes.ok) { setError('Could not load financials.'); return; }
      const po = await poRes.json();
      const pm = await pmRes.json();
      setConfigured(po.configured !== false && pm.configured !== false);
      setPayouts(po.payouts ?? []);
      setPayments(pm.payments ?? []);
      setLegacy(lgRes.ok ? await lgRes.json() : []);
    } catch { setError('Could not load financials.'); }
  }, [authedFetch]);

  useEffect(() => { load(); }, [load]);

  async function markPaid(bookingId: string) {
    setBusy(bookingId); setError(null);
    try {
      const res = await authedFetch(`/api/admin/payouts/${bookingId}/mark-paid`, { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || 'Could not mark the payout as paid.');
        return;
      }
      await load();
    } catch { setError('Could not mark the payout as paid.'); }
    finally { setBusy(null); }
  }

  if (payouts === null || payments === null || legacy === null) {
    return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading financials…</div>;
  }

  const earnings = aggregateEarnings(legacy);
  const legacySection = earnings.length > 0 ? (
    <section>
      <h2 className="text-lg font-semibold text-foreground">Past earnings (imported)</h2>
      <p className="text-sm text-muted mt-0.5 mb-4">
        Historical sessions from the old portal, per mentor. This is the gross amount the customer paid (the old net/commission split isn&apos;t available).
      </p>
      <div className="overflow-x-auto rounded-xl border border-[--color-border]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-[--color-border]">
              <th className="px-4 py-2.5 font-medium">Mentor</th>
              <th className="px-4 py-2.5 font-medium">Sessions</th>
              <th className="px-4 py-2.5 font-medium">Gross earnings</th>
            </tr>
          </thead>
          <tbody>
            {earnings.map((e) => (
              <tr key={e.mentor} className="border-b border-[--color-border] last:border-0">
                <td className="px-4 py-2.5 text-foreground">{e.mentor}</td>
                <td className="px-4 py-2.5 text-muted">{e.count}</td>
                <td className="px-4 py-2.5 text-foreground">
                  {Object.keys(e.totals).length === 0 ? '-' : Object.entries(e.totals).map(([c, a]) => money(a, c)).join(' · ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  ) : null;

  if (!configured) {
    return (
      <div className="flex flex-col gap-10">
        {legacySection}
        <Card>
          <CardBody className="pt-10 pb-10 flex flex-col items-center text-center gap-2">
            <div className="h-11 w-11 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
              <Wrench className="h-5 w-5" />
            </div>
            <p className="text-base font-semibold text-foreground">Payments not set up yet</p>
            <p className="text-sm text-muted max-w-md">
              Apply <code>payments_setup.sql</code> and enable payments (see docs/PAYMENTS.md).
              Payouts and payments will appear here once the first paid booking comes through.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {legacySection}

      {/* ── Referral commissions (promoter payouts) ────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-foreground">Referral commissions</h2>
        <p className="text-sm text-muted mt-0.5 mb-4">
          Promoter payouts from referral codes: who referred the customer, the discount, the final amount paid, the
          split, and the commission owed. Approve or reject in the Referrals tab; mark one paid here once you&apos;ve sent it.
        </p>
        <AdminReferralCommissions />
      </section>

      {/* ── Mentor payouts ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-foreground">Mentor payouts</h2>
        <p className="text-sm text-muted mt-0.5 mb-4">
          What each mentor is owed per session. Payouts are made manually; mark one paid once you&apos;ve sent the transfer.
        </p>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted">No payouts yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[--color-border]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted border-b border-[--color-border]">
                  <th className="px-4 py-2.5 font-medium">Session</th>
                  <th className="px-4 py-2.5 font-medium">Mentor</th>
                  <th className="px-4 py-2.5 font-medium">Payout</th>
                  <th className="px-4 py-2.5 font-medium">State</th>
                  <th className="px-4 py-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => {
                  const completed = p.bookings?.status === 'completed';
                  const canPay = p.payout_state === 'pending' && completed;
                  return (
                    <tr key={p.id} className="border-b border-[--color-border] last:border-0">
                      <td className="px-4 py-2.5 whitespace-nowrap text-foreground">
                        {fmt(p.bookings?.slot_time ?? null)}
                        <span className="block text-xs text-muted">{p.bookings?.candidate_name ?? p.bookings?.candidate_email ?? '-'}</span>
                      </td>
                      <td className="px-4 py-2.5 text-foreground">{p.mentors?.display_name ?? '-'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-foreground">
                        {money(p.net_amount_mentor_currency, p.mentor_currency)}
                        {p.payout_reference && <span className="block text-xs text-muted">ref {p.payout_reference}</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={PAYOUT_TONE[p.payout_state] ?? 'neutral'}>{p.payout_state}</Badge>
                        {p.paid_date && <span className="block text-xs text-muted mt-0.5">{fmt(p.paid_date)}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {p.payout_state === 'paid' ? (
                          <span className="text-xs text-muted">Paid</span>
                        ) : canPay ? (
                          <Button size="sm" variant="accent" loading={busy === p.booking_id} onClick={() => markPaid(p.booking_id)}>
                            Mark paid
                          </Button>
                        ) : p.payout_state === 'pending' ? (
                          <span className="text-xs text-muted">Awaiting session</span>
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Customer payments ──────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-foreground">Customer payments</h2>
        <p className="text-sm text-muted mt-0.5 mb-4">Every charge collected through Razorpay, newest first.</p>
        {payments.length === 0 ? (
          <p className="text-sm text-muted">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[--color-border]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted border-b border-[--color-border]">
                  <th className="px-4 py-2.5 font-medium">When</th>
                  <th className="px-4 py-2.5 font-medium">Mentor</th>
                  <th className="px-4 py-2.5 font-medium">Customer</th>
                  <th className="px-4 py-2.5 font-medium">Amount</th>
                  <th className="px-4 py-2.5 font-medium">State</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-[--color-border] last:border-0">
                    <td className="px-4 py-2.5 whitespace-nowrap text-foreground">{fmt(p.created_at)}</td>
                    <td className="px-4 py-2.5 text-foreground">{p.bookings?.mentors?.display_name ?? '-'}</td>
                    <td className="px-4 py-2.5 min-w-0">
                      <span className="text-foreground">{p.bookings?.candidate_name ?? '-'}</span>
                      <span className="block text-xs text-muted truncate">{p.bookings?.candidate_email}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-foreground">{money(p.amount, p.currency)}</td>
                    <td className="px-4 py-2.5"><Badge tone={PAYMENT_TONE[p.state] ?? 'neutral'}>{p.state.replace('_', ' ')}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
