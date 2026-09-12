'use client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';

interface AffiliateRow {
  affiliate_id: string; type: string; name: string; mentor_id: string | null; status: string;
  codes: number; active_codes: number; redemptions: number; referrals: number;
  commission_inr: number; commission_pending_inr: number;
}
interface Split { mentor_pct: number; immigroov_pct: number; promoter_pct: number; }
interface CommissionRow {
  booking_id: string; completed_at: string; affiliate_id: string; affiliate_name: string;
  referral_code: string | null; customer_email: string; customer_name: string | null;
  service_id: string; mentor_id: string; mentor_name: string; discount_pct: number;
  gross_customer: number; customer_currency: string; split: Split;
  commission_amount: number; commission_amount_inr: number; status: string;
}

interface FlagRow {
  flag_id: string; vector_type: string; status: string; created_at: string;
  resolved_at: string | null; escalated_to_cofounder_at: string | null;
  decision: string | null; note: string | null;
  affiliate_id: string; affiliate_name: string; affiliate_type: string; affiliate_status: string;
  affiliate_tier: string; affiliate_open_flags: number; affiliate_lifetime_referrals: number;
  booking_id: string | null; booking_status: string | null; slot_time: string | null;
  reschedule_count: number | null; no_show_by: string | null;
  customer_name: string | null; customer_email: string | null; mentor_name: string | null;
  ledger_id: string | null; commission_status: string | null;
  commission_amount: number | null; commission_currency: string | null; commission_inr: number | null;
  referral_code: string | null; split: Split | null;
}

// What each signal means, in the reviewer's language. A queue that only prints an enum name
// makes every case a research task.
const VECTOR: Record<string, { label: string; why: string }> = {
  duplicate_person:      { label: 'Same person, new email',   why: 'This phone number already completed a booking under a different email address.' },
  volume_spike:          { label: 'Unusual volume',           why: 'Referrals today are well above this affiliate\u2019s own 30-day average.' },
  geography_mismatch:    { label: 'Geography mismatch',       why: 'The customer\u2019s location does not fit the affiliate\u2019s audience.' },
  code_speed:            { label: 'Code redeemed too fast',   why: 'The code was used within minutes of being created, which leaves no time for a real referral.' },
  cancel_rebook_cycling: { label: 'Cancel and rebook cycling', why: 'Repeated rescheduling around the attribution window, or a session closed after the customer never attended.' },
  mentor_steering:       { label: 'Mentor steering',          why: 'The mentor appears to be directing their own customers through a referral.' },
  chargeback:            { label: 'Chargeback',               why: 'The customer disputed the payment for this booking.' },
};

const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const money = (n: number, ccy: string) => `${ccy || ''} ${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`.trim();

function useAuthedFetch() {
  return useCallback(async (url: string, init?: RequestInit) => {
    const { data: { session } } = await createClient().auth.getSession();
    return fetch(url, { ...init, headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, ...(init?.headers ?? {}) }, cache: 'no-store' });
  }, []);
}

// Full admin Referrals section: affiliates overview + the commission (money) view.
export function AdminReferrals() {
  const [view, setView] = useState<'affiliates' | 'commissions' | 'review'>('affiliates');
  const [rows, setRows] = useState<AffiliateRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: string; name: string } | null>(null);
  const [flags, setFlags] = useState<FlagRow[] | null>(null);
  const [includeResolved, setIncludeResolved] = useState(false);
  const authedFetch = useAuthedFetch();

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await authedFetch('/api/referrals/admin/overview');
      if (!res.ok) { setError('Could not load referrals.'); return; }
      setRows(await res.json());
    } catch { setError('Could not load referrals.'); }
  }, [authedFetch]);
  useEffect(() => { load(); }, [load]);

  // Loaded at the top level so the open count can sit on the tab. A review queue that gives no
  // sign it has anything in it is a review queue nobody opens.
  const loadFlags = useCallback(async () => {
    try {
      const res = await authedFetch(`/api/referrals/admin/flags?include_resolved=${includeResolved}`);
      if (!res.ok) { setFlags([]); return; }
      setFlags(await res.json());
    } catch { setFlags([]); }
  }, [authedFetch, includeResolved]);
  useEffect(() => { loadFlags(); }, [loadFlags]);

  const openFlags = (flags ?? []).filter((f) => f.status === 'escalated').length;

  return (
    <div className="flex flex-col gap-4">
      {rows && rows.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <RefKpi label="Affiliates" value={String(rows.length)} />
          <RefKpi label="Referrals" value={String(rows.reduce((s, r) => s + r.referrals, 0))} />
          <RefKpi label="Commission earned" value={inr(rows.reduce((s, r) => s + (r.commission_inr || 0), 0))} hint="approved + paid" />
          <RefKpi label="Commission pending" value={inr(rows.reduce((s, r) => s + (r.commission_pending_inr || 0), 0))} hint="under review" />
        </div>
      )}
      <div className="flex gap-2">
        {(['affiliates', 'commissions', 'review'] as const).map((v) => (
          <button key={v} type="button" onClick={() => { setView(v); if (v === 'affiliates') setFocus(null); }}
            className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
              view === v ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-[--color-border] text-muted hover:text-foreground'}`}>
            {v === 'affiliates' ? 'Affiliates & codes' : v === 'commissions' ? 'Commissions' : 'Review queue'}
            {v === 'review' && openFlags > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-800">{openFlags}</span>
            )}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {view === 'affiliates' && (
        rows === null ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead><tr className="text-left text-xs text-muted border-b border-[--color-border]">
                <Th>Affiliate</Th><Th>Type</Th><Th>Codes</Th><Th>Redemptions</Th><Th>Referrals</Th>
                <Th>Earned</Th><Th>Pending</Th><Th></Th>
              </tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={8} className="py-4 text-muted">No affiliates yet.</td></tr>}
                {rows.map((r) => (
                  <tr key={r.affiliate_id} className="border-b border-[--color-border]/60">
                    <Td><span className="font-medium text-foreground">{r.name}</span>{r.status !== 'active' && <span className="ml-2 text-xs text-amber-700">({r.status})</span>}</Td>
                    <Td>{r.type === 'mentor' ? 'Mentor' : 'Influencer'}</Td>
                    <Td>{r.active_codes}/{r.codes}</Td>
                    <Td>{r.redemptions}</Td>
                    <Td>{r.referrals}</Td>
                    <Td>{inr(r.commission_inr)}</Td>
                    <Td className="text-amber-700">{inr(r.commission_pending_inr)}</Td>
                    <Td><Button variant="outline" size="sm" onClick={() => { setFocus({ id: r.affiliate_id, name: r.name }); setView('commissions'); }}>View</Button></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {view === 'commissions' && (
        <AdminReferralCommissions affiliateId={focus?.id} heading={focus ? `Commissions - ${focus.name}` : undefined} onChanged={load} />
      )}

      {view === 'review' && (
        <AdminFraudQueue
          flags={flags}
          includeResolved={includeResolved}
          onToggleResolved={setIncludeResolved}
          onChanged={() => { loadFlags(); load(); }}
        />
      )}
    </div>
  );
}

// The review queue. Every flagged commission sits here until a human decides, and each card
// carries the case with it: who the affiliate is, what else is open against them, which booking
// this was, and what is being held.
function AdminFraudQueue({ flags, includeResolved, onToggleResolved, onChanged }: {
  flags: FlagRow[] | null;
  includeResolved: boolean;
  onToggleResolved: (v: boolean) => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const authedFetch = useAuthedFetch();

  async function decide(f: FlagRow, decision: string) {
    const note = (notes[f.flag_id] ?? '').trim();
    if (decision === 'approve_with_note' && !note) { setError('Add a note before approving with one.'); return; }
    setBusy(f.flag_id); setError(null);
    try {
      const res = await authedFetch(`/api/referrals/admin/flags/${f.flag_id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note: note || null }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.detail || 'Could not record the decision.'); return; }
      setNotes((n) => ({ ...n, [f.flag_id]: '' }));
      onChanged();
    } catch { setError('Could not record the decision.'); }
    finally { setBusy(null); }
  }

  if (flags === null) return <Loading />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          A flagged commission is never paid on a date passing. It waits here for a decision.
        </p>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={includeResolved} onChange={(e) => onToggleResolved(e.target.checked)} />
          Show decided
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {flags.length === 0 && (
        <p className="text-sm text-muted">
          {includeResolved ? 'Nothing has been flagged yet.' : 'Nothing waiting. Every flag has been decided.'}
        </p>
      )}

      {flags.map((f) => {
        const v = VECTOR[f.vector_type] ?? { label: f.vector_type, why: '' };
        const decided = f.status === 'resolved';
        return (
          <Card key={f.flag_id}><CardBody className="pt-4 pb-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{v.label}</span>
                  <FlagPill status={f.status} />
                  {f.escalated_to_cofounder_at && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">With co-founder</span>
                  )}
                </div>
                {v.why && <p className="mt-1 text-xs text-muted">{v.why}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-foreground">{inr(f.commission_inr ?? 0)}</p>
                <p className="text-[11px] text-muted">
                  {f.commission_status ? `commission ${f.commission_status.replace('_', ' ')}` : 'no commission attached'}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              <Fact label="Affiliate" value={f.affiliate_name}
                    sub={`${f.affiliate_type === 'mentor' ? 'Mentor' : 'Influencer'} · ${f.affiliate_tier} · ${f.affiliate_lifetime_referrals} referrals`} />
              <Fact label="Customer" value={f.customer_name || f.customer_email || '-'} sub={f.customer_name ? f.customer_email : null} />
              <Fact label="Mentor" value={f.mentor_name || '-'}
                    sub={f.slot_time ? new Date(f.slot_time).toLocaleDateString() : 'no time set'} />
              <Fact label="Booking" value={f.booking_status || '-'}
                    sub={[f.reschedule_count ? `${f.reschedule_count} reschedules` : null,
                         f.no_show_by ? `${f.no_show_by} no-show` : null].filter(Boolean).join(' · ') || null} />
            </dl>

            {f.affiliate_open_flags > 1 && !decided && (
              <p className="text-xs text-amber-700">
                {f.affiliate_open_flags} open flags against this affiliate. They stay on Starter rates until all are cleared.
              </p>
            )}

            {decided ? (
              <p className="text-xs text-muted">
                {f.decision?.replace(/_/g, ' ')} on {f.resolved_at ? new Date(f.resolved_at).toLocaleDateString() : '-'}
                {f.note ? ` · ${f.note}` : ''}
              </p>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={notes[f.flag_id] ?? ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [f.flag_id]: e.target.value }))}
                  placeholder="Note (required to approve with one)"
                  className="h-9 min-w-0 flex-1 rounded-lg bg-white px-3 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none" />
                <div className="flex flex-wrap gap-2">
                  <Button variant="accent" size="sm" loading={busy === f.flag_id} onClick={() => decide(f, 'approve')}>Approve</Button>
                  <Button variant="outline" size="sm" onClick={() => decide(f, 'approve_with_note')}>Approve with note</Button>
                  <Button variant="outline" size="sm" onClick={() => decide(f, 'reject_and_hold')}>Reject and hold</Button>
                </div>
              </div>
            )}
          </CardBody></Card>
        );
      })}
    </div>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="truncate text-sm text-foreground" title={value}>{value}</dd>
      {sub && <dd className="truncate text-[11px] text-muted" title={sub}>{sub}</dd>}
    </div>
  );
}

function FlagPill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    escalated:    ['Waiting', 'bg-amber-50 text-amber-700'],
    auto_cleared: ['Auto-cleared', 'bg-slate-100 text-slate-500'],
    resolved:     ['Decided', 'bg-green-50 text-green-700'],
  };
  const [txt, cls] = map[status] ?? ['Unknown', 'bg-slate-100 text-slate-500'];
  return <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{txt}</span>;
}

// The commission / payout view: one row per referred booking. Reused in Payouts.
export function AdminReferralCommissions({ affiliateId, heading, onChanged }: {
  affiliateId?: string; heading?: string; onChanged?: () => void;
}) {
  const [rows, setRows] = useState<CommissionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const authedFetch = useAuthedFetch();

  const load = useCallback(async () => {
    setError(null);
    try {
      const q = affiliateId ? `?affiliate_id=${affiliateId}` : '';
      const res = await authedFetch(`/api/referrals/admin/bookings${q}`);
      if (!res.ok) { setError('Could not load commissions.'); return; }
      setRows(await res.json());
    } catch { setError('Could not load commissions.'); }
  }, [authedFetch, affiliateId]);
  useEffect(() => { load(); }, [load]);

  // The commission endpoint keys on the ledger id (returned as ledger_id on each row).
  async function act(row: CommissionRow & { ledger_id?: string }, status: string) {
    setBusy(row.booking_id);
    try {
      const res = await authedFetch(`/api/referrals/admin/commission/${row.ledger_id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.detail || 'Update failed.'); return; }
      await load(); onChanged?.();
    } catch { setError('Update failed.'); }
    finally { setBusy(null); }
  }

  if (rows === null && !error) return <Loading />;

  return (
    <div className="flex flex-col gap-3">
      {heading && <p className="text-sm font-semibold text-foreground">{heading}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead><tr className="text-left text-xs text-muted border-b border-[--color-border]">
            <Th>Completed</Th><Th>By (code)</Th><Th>Customer</Th><Th>Mentor</Th><Th>Discount</Th>
            <Th>Paid</Th><Th>Split (M/I/P)</Th><Th>Commission</Th><Th>Status</Th><Th></Th>
          </tr></thead>
          <tbody>
            {(rows ?? []).length === 0 && <tr><td colSpan={10} className="py-4 text-muted">No referred bookings yet.</td></tr>}
            {(rows ?? []).map((r: CommissionRow & { ledger_id?: string }) => (
              <tr key={r.booking_id} className="border-b border-[--color-border]/60 align-top">
                <Td>{r.completed_at ? new Date(r.completed_at).toLocaleDateString() : '-'}</Td>
                <Td><span className="font-medium text-foreground">{r.affiliate_name}</span>{r.referral_code && <span className="block font-mono text-xs text-muted">{r.referral_code}</span>}</Td>
                <Td>{r.customer_name || r.customer_email}</Td>
                <Td>{r.mentor_name}</Td>
                <Td>{r.discount_pct ? `${r.discount_pct}%` : '-'}</Td>
                <Td>{money(r.gross_customer, r.customer_currency)}</Td>
                <Td>{r.split ? `${r.split.mentor_pct}/${r.split.immigroov_pct}/${r.split.promoter_pct}` : '-'}</Td>
                <Td>{inr(r.commission_amount_inr)}</Td>
                <Td><StatusPill status={r.status} /></Td>
                <Td>
                  <div className="flex gap-1">
                    {r.status === 'pending_review' && <>
                      <Button variant="accent" size="sm" loading={busy === r.booking_id} onClick={() => act(r, 'approved')}>Approve</Button>
                      <Button variant="outline" size="sm" onClick={() => act(r, 'rejected')}>Reject</Button>
                    </>}
                    {r.status === 'approved' && <Button variant="outline" size="sm" loading={busy === r.booking_id} onClick={() => act(r, 'paid')}>Mark paid</Button>}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending_review: 'bg-amber-50 text-amber-700', approved: 'bg-blue-50 text-blue-700',
    paid: 'bg-green-50 text-green-700', rejected: 'bg-red-50 text-red-600', void: 'bg-slate-100 text-slate-500',
  };
  const label = status === 'pending_review' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`text-xs px-2 py-0.5 rounded-full ${map[status] || 'bg-slate-100 text-slate-500'}`}>{label}</span>;
}

function RefKpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card><CardBody className="pt-4 pb-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
      {hint && <p className="text-[11px] text-muted/70 mt-0.5">{hint}</p>}
    </CardBody></Card>
  );
}

const Loading = () => <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
const Th = ({ children }: { children?: ReactNode }) => <th className="py-2 pr-3 font-medium">{children}</th>;
const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={`py-2 pr-3 ${className ?? ''}`}>{children}</td>;
