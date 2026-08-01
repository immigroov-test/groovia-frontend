'use client';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2, Wrench, ArrowLeft, ChevronRight } from 'lucide-react';
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
  id: string; booking_id: string; amount: number | null;
  net_amount_mentor_currency: number | null; mentor_currency: string | null;
  gross_amount: number | null; customer_currency: string | null;
  payout_state: string; method: string | null; payout_reference: string | null;
  paid_date: string | null; created_at: string;
  mentors?: MentorRef | null; bookings?: BookingRef | null;
}
interface Payment { id: string; amount: number | null; currency: string | null; state: string; }
interface LegacyRow {
  id: string; status: string | null; service_title: string | null;
  slot_start: string | null; duration_min: number | null; amount_total: number | null;
  amount_currency: string | null; mentor_name: string | null; customer_name: string | null;
}

const PAYOUT_TONE: Record<string, 'brand' | 'accent' | 'neutral' | 'success' | 'warning'> = {
  pending: 'neutral', paid: 'success', void: 'neutral', blocked: 'warning',
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
function merge(target: Ccy, src: Ccy) { for (const [c, v] of Object.entries(src)) target[c] = (target[c] ?? 0) + v; }
function moneyList(totals: Ccy): string {
  const e = Object.entries(totals).filter(([, v]) => v);
  return e.length ? e.map(([c, v]) => money(v, c)).join('  ·  ') : '-';
}

interface MentorAgg {
  name: string; payouts: Payout[]; past: LegacyRow[];
  owed: Ccy; paid: Ccy; earned: Ccy; pastGross: Ccy;
}

export function AdminPayouts() {
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [legacy, setLegacy] = useState<LegacyRow[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);   // mentor drilled into

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
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.detail || 'Could not mark the payout as paid.'); return; }
      await load();
    } catch { setError('Could not mark the payout as paid.'); }
    finally { setBusy(null); }
  }

  // One aggregate per mentor, across live payouts + imported past sessions.
  const mentors = useMemo(() => {
    const m = new Map<string, MentorAgg>();
    const get = (name: string) => {
      let g = m.get(name);
      if (!g) { g = { name, payouts: [], past: [], owed: {}, paid: {}, earned: {}, pastGross: {} }; m.set(name, g); }
      return g;
    };
    (payouts ?? []).forEach((p) => {
      const g = get(p.mentors?.display_name ?? '-');
      g.payouts.push(p);
      add(g.earned, p.mentor_currency, p.net_amount_mentor_currency);
      if (p.payout_state === 'pending') add(g.owed, p.mentor_currency, p.net_amount_mentor_currency);
      if (p.payout_state === 'paid') add(g.paid, p.mentor_currency, p.net_amount_mentor_currency);
    });
    (legacy ?? []).forEach((r) => {
      const g = get(r.mentor_name ?? '-');
      g.past.push(r);
      add(g.pastGross, r.amount_currency, r.amount_total);
    });
    return Array.from(m.values()).sort((a, b) => (b.payouts.length + b.past.length) - (a.payouts.length + a.past.length));
  }, [payouts, legacy]);

  if (payouts === null || payments === null || legacy === null) {
    return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading financials…</div>;
  }
  if (!configured && mentors.length === 0) {
    return (
      <Card><CardBody className="pt-10 pb-10 flex flex-col items-center text-center gap-2">
        <div className="h-11 w-11 rounded-full bg-brand-50 flex items-center justify-center text-brand-600"><Wrench className="h-5 w-5" /></div>
        <p className="text-base font-semibold text-foreground">Payments not set up yet</p>
        <p className="text-sm text-muted max-w-md">Turn on <code>platform_settings.payments_enabled</code> (see docs/PAYMENTS.md). Payouts appear here once the first paid booking comes through.</p>
      </CardBody></Card>
    );
  }

  // Global totals for the KPI row.
  const owed: Ccy = {}, paid: Ccy = {}, past: Ccy = {}, collected: Ccy = {};
  mentors.forEach((g) => { merge(owed, g.owed); merge(paid, g.paid); merge(past, g.pastGross); });
  (payments ?? []).forEach((p) => { if (p.state === 'captured') add(collected, p.currency, p.amount); });

  const sel = selected ? mentors.find((g) => g.name === selected) ?? null : null;

  return (
    <div className="flex flex-col gap-8">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Owed to mentors" value={moneyList(owed)} />
        <Kpi label="Paid to mentors" value={moneyList(paid)} />
        <Kpi label="Collected from customers" value={moneyList(collected)} />
        <Kpi label="Past earnings (imported)" value={moneyList(past)} />
      </div>

      {!sel ? (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-1">Mentors</h2>
          <p className="text-sm text-muted mb-4">One card per mentor. Click a mentor to see every session and mark payouts paid.</p>
          {mentors.length === 0 ? <p className="text-sm text-muted">No mentor earnings yet.</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {mentors.map((g) => (
                <button key={g.name} type="button" onClick={() => setSelected(g.name)} className="text-left w-full">
                  <Card className="h-full hover:shadow-md transition-shadow"><CardBody className="pt-4 pb-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground truncate">{g.name}</p>
                      <ChevronRight className="h-4 w-4 text-muted shrink-0" />
                    </div>
                    <div className="flex flex-col gap-0.5 text-sm">
                      <Line k="Earned (net)" v={moneyList(g.earned)} />
                      {Object.keys(g.owed).length > 0 && <Line k="Owed now" v={moneyList(g.owed)} amber />}
                      {Object.keys(g.pastGross).length > 0 && <Line k="Past (imported)" v={moneyList(g.pastGross)} />}
                    </div>
                    <p className="text-xs text-muted">{g.payouts.length} live · {g.past.length} imported</p>
                  </CardBody></Card>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}><ArrowLeft className="h-4 w-4" /> All mentors</Button>
            <h2 className="text-lg font-semibold text-foreground">{sel.name}</h2>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
            <span>Earned <b className="text-foreground">{moneyList(sel.earned)}</b></span>
            <span>Owed <b className="text-amber-700">{moneyList(sel.owed)}</b></span>
            <span>Paid <b className="text-foreground">{moneyList(sel.paid)}</b></span>
            {Object.keys(sel.pastGross).length > 0 && <span>Past imported <b className="text-foreground">{moneyList(sel.pastGross)}</b></span>}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Live sessions</h3>
            {sel.payouts.length === 0 ? <p className="text-sm text-muted">No live payouts yet.</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sel.payouts.map((p) => <PayoutCard key={p.id} p={p} busy={busy} onPay={markPaid} />)}
              </div>
            )}
          </div>

          {sel.past.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Imported sessions</h3>
              <div className="overflow-x-auto rounded-xl border border-[--color-border]">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-muted border-b border-[--color-border]">
                    <th className="px-4 py-2.5 font-medium">When</th><th className="px-4 py-2.5 font-medium">Customer</th>
                    <th className="px-4 py-2.5 font-medium">Session</th><th className="px-4 py-2.5 font-medium">Gross</th>
                  </tr></thead>
                  <tbody>
                    {sel.past.map((s) => (
                      <tr key={s.id} className="border-b border-[--color-border] last:border-0">
                        <td className="px-4 py-2.5 whitespace-nowrap text-foreground">{fmt(s.slot_start)}</td>
                        <td className="px-4 py-2.5 text-foreground">{s.customer_name ?? '-'}</td>
                        <td className="px-4 py-2.5 text-foreground">{s.service_title ?? 'Session'}{s.duration_min ? <span className="text-xs text-muted"> · {s.duration_min} min</span> : null}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-foreground">{money(s.amount_total, s.amount_currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
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
          <p className="text-sm font-medium text-foreground truncate">{fmt(p.bookings?.slot_time ?? null)}</p>
          <p className="text-xs text-muted truncate">{p.bookings?.candidate_name ?? p.bookings?.candidate_email ?? '-'}</p>
        </div>
        <Badge tone={PAYOUT_TONE[p.payout_state] ?? 'neutral'}>{p.payout_state}</Badge>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-sm">
          <p className="text-foreground"><span className="text-muted">Net </span><b className="text-base">{money(p.net_amount_mentor_currency, p.mentor_currency)}</b></p>
          <p className="text-xs text-muted">Customer paid {money(p.gross_amount, p.customer_currency)}</p>
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

function Line({ k, v, amber }: { k: string; v: string; amber?: boolean }) {
  return <div className="flex justify-between gap-2"><span className="text-muted">{k}</span><span className={amber ? 'text-amber-700 font-medium' : 'text-foreground font-medium'}>{v}</span></div>;
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
