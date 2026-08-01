'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Copy, Check } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';

interface RefCode {
  id: string; code: string; discount_pct: number;
  redemption_cap: number | null; redemption_count: number;
  expires_at: string | null; is_active: boolean; expired: boolean; created_at: string;
}
interface Overview {
  affiliate_id: string | null; codes: RefCode[];
  referrals: number; earnings_inr: number; pending_inr: number;
}

const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function MentorReferrals() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ discount_pct: '10', redemption_cap: '100', expires_at: '' });

  const authedFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data: { session } } = await createClient().auth.getSession();
    return fetch(url, { ...init, headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, ...(init?.headers ?? {}) }, cache: 'no-store' });
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await authedFetch('/api/referrals/mine');
      if (!res.ok) { setError('Could not load your referrals.'); return; }
      setData(await res.json());
    } catch { setError('Could not load your referrals.'); }
  }, [authedFetch]);

  useEffect(() => { load(); }, [load]);

  async function createCode() {
    setCreating(true); setError(null);
    try {
      const body: Record<string, unknown> = {
        discount_pct: parseFloat(form.discount_pct) || 0,
        redemption_cap: Math.max(1, parseInt(form.redemption_cap, 10) || 100),   // always a finite cap
      };
      if (form.expires_at) body.expires_at = new Date(form.expires_at).toISOString();
      const res = await authedFetch('/api/referrals/codes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.detail || 'Could not create the code.'); return; }
      setForm({ discount_pct: '10', redemption_cap: '100', expires_at: '' });
      await load();
    } catch { setError('Could not create the code.'); }
    finally { setCreating(false); }
  }

  async function toggleActive(c: RefCode) {
    try {
      await authedFetch(`/api/referrals/codes/${c.id}/active`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !c.is_active }),
      });
      await load();
    } catch { setError('Could not update the code.'); }
  }

  async function copy(code: string) {
    try { await navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(null), 1500); } catch { /* ignore */ }
  }

  if (data === null && !error) return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  const codes = data?.codes ?? [];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">
        Share a referral code. When someone books their first session with it, they get the discount and you earn a
        referral commission on that session.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Earnings summary */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Referrals" value={String(data?.referrals ?? 0)} />
        <Stat label="Earned" value={inr(data?.earnings_inr ?? 0)} hint="approved + paid" />
        <Stat label="Pending" value={inr(data?.pending_inr ?? 0)} hint="under review" />
      </div>

      {/* Generate a code */}
      <Card><CardBody className="pt-4 pb-4 flex flex-col gap-3">
        <p className="text-sm font-semibold text-foreground">Generate a code</p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Discount %" value={form.discount_pct} onChange={(v) => setForm((f) => ({ ...f, discount_pct: v }))} type="number" max={50} />
          <Field label="Usage limit" value={form.redemption_cap} onChange={(v) => setForm((f) => ({ ...f, redemption_cap: v }))} type="number" />
          <Field label="Expiry (optional)" value={form.expires_at} onChange={(v) => setForm((f) => ({ ...f, expires_at: v }))} type="date" />
          <Button variant="accent" size="sm" loading={creating} onClick={createCode}><Plus className="h-4 w-4" /> Generate</Button>
        </div>
        <p className="text-xs text-muted">The code is generated for you. Max discount 50%; a blank expiry defaults to 90 days.</p>
      </CardBody></Card>

      {/* Codes list */}
      <div className="flex flex-col gap-2">
        {codes.length === 0 && <p className="text-sm text-muted">No codes yet. Generate one above.</p>}
        {codes.map((c) => (
          <Card key={c.id}><CardBody className="pt-3 pb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2 min-w-[160px]">
              <span className="font-mono font-semibold text-brand-900">{c.code}</span>
              <button type="button" onClick={() => copy(c.code)} className="text-muted hover:text-foreground" aria-label="Copy code">
                {copied === c.code ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <span className="text-sm text-foreground">{c.discount_pct}% off</span>
            <span className="text-sm text-muted">
              Used {c.redemption_count}{c.redemption_cap != null ? ` / ${c.redemption_cap}` : ''}
            </span>
            <span className="text-sm text-muted">{c.expires_at ? `Expires ${new Date(c.expires_at).toLocaleDateString()}` : 'No expiry'}</span>
            <StatusBadge expired={c.expired} active={c.is_active} />
            <div className="ml-auto">
              {!c.expired && (
                <Button variant="outline" size="sm" onClick={() => toggleActive(c)}>{c.is_active ? 'Deactivate' : 'Activate'}</Button>
              )}
            </div>
          </CardBody></Card>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card><CardBody className="pt-4 pb-4">
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
      {hint && <p className="text-[11px] text-muted/70">{hint}</p>}
    </CardBody></Card>
  );
}

function StatusBadge({ expired, active }: { expired: boolean; active: boolean }) {
  const [txt, cls] = expired
    ? ['Expired', 'bg-slate-100 text-slate-500']
    : active
      ? ['Active', 'bg-green-50 text-green-700']
      : ['Inactive', 'bg-amber-50 text-amber-700'];
  return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{txt}</span>;
}

function Field({ label, value, onChange, type = 'text', placeholder, wide, max }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; wide?: boolean; max?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted">{label}</span>
      <input type={type} value={value} placeholder={placeholder}
        {...(type === 'number' ? { min: 0, step: 1, ...(max != null ? { max } : {}) } : {})}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 ${wide ? 'w-40' : 'w-28'} px-2 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none`} />
    </label>
  );
}
