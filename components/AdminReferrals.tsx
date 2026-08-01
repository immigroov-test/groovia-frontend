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
  const [view, setView] = useState<'affiliates' | 'commissions'>('affiliates');
  const [rows, setRows] = useState<AffiliateRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: string; name: string } | null>(null);
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
        {(['affiliates', 'commissions'] as const).map((v) => (
          <button key={v} type="button" onClick={() => { setView(v); if (v === 'affiliates') setFocus(null); }}
            className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
              view === v ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-[--color-border] text-muted hover:text-foreground'}`}>
            {v === 'affiliates' ? 'Affiliates & codes' : 'Commissions'}
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
    </div>
  );
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
