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
  service_id: string | null; service_title: string | null;
}
interface Overview {
  affiliate_id: string | null; codes: RefCode[];
  enrolled: boolean; enrolled_at: string | null; left_at: string | null; terms_version: string | null;
  link_slug: string | null; profile_slug: string | null; link_clicks: number;
  referrals: number;
  paid_inr: number; pending_inr: number; frozen_inr: number;
  upcoming_count: number; upcoming_est_inr: number;
}
interface ServiceOption { id: string; title: string; }

// Bump together with the backend's TERMS_VERSION when the rates or rules change.
const TERMS_VERSION = 'v2-2026-09';
const MAX_DISCOUNT = 20;

const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function MentorReferrals() {
  const [data, setData] = useState<Overview | null>(null);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ discount_pct: '10', redemption_cap: '100', expires_at: '', service_id: '' });
  const [origin, setOrigin] = useState('');

  useEffect(() => { setOrigin(window.location.origin); }, []);

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
    // The session types, so a code can be limited to one of them. Best-effort: without the
    // list the code is simply generic.
    try {
      const res = await authedFetch('/api/mentor/services');
      if (res.ok) {
        const list = await res.json();
        const arr: { id: string; title: string }[] = Array.isArray(list) ? list : (list?.services ?? []);
        setServices(arr.map((s) => ({ id: s.id, title: s.title })));
      }
    } catch { /* generic codes only */ }
  }, [authedFetch]);

  useEffect(() => { load(); }, [load]);

  async function join() {
    if (!agreed) { setError('Please accept the programme terms to join.'); return; }
    setJoining(true); setError(null);
    try {
      const res = await authedFetch('/api/referrals/join', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreed: true, terms_version: TERMS_VERSION }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.detail || 'Could not join the programme.'); return; }
      await load();
    } catch { setError('Could not join the programme.'); }
    finally { setJoining(false); }
  }

  async function leave() {
    if (!window.confirm('Leave the referral programme? Every open referral tied to you ends now, and your codes are deactivated. Commissions already earned are not affected.')) return;
    setJoining(true); setError(null);
    try {
      const res = await authedFetch('/api/referrals/leave', { method: 'POST' });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.detail || 'Could not leave the programme.'); return; }
      await load();
    } catch { setError('Could not leave the programme.'); }
    finally { setJoining(false); }
  }

  async function createCode() {
    setCreating(true); setError(null);
    try {
      const body: Record<string, unknown> = {
        discount_pct: Math.min(MAX_DISCOUNT, Math.max(0, parseFloat(form.discount_pct) || 0)),
        redemption_cap: Math.max(1, parseInt(form.redemption_cap, 10) || 100),   // always a finite cap
      };
      if (form.expires_at) body.expires_at = new Date(form.expires_at).toISOString();
      if (form.service_id) body.service_id = form.service_id;
      const res = await authedFetch('/api/referrals/codes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.detail || 'Could not create the code.'); return; }
      setForm({ discount_pct: '10', redemption_cap: '100', expires_at: '', service_id: '' });
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

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(text); setTimeout(() => setCopied(null), 1500); } catch { /* ignore */ }
  }

  if (data === null && !error) return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  const codes = data?.codes ?? [];
  const enrolled = !!data?.enrolled;
  const profileUrl = data?.profile_slug ? `${origin}/mentors/${data.profile_slug}` : '';
  const shortUrl = data?.link_slug ? `${origin}/r/${data.link_slug}` : '';

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!enrolled ? (
        // Not in the programme: the profile link still takes bookings at the normal rate, and
        // nothing here earns until they join. The terms are the consent trail for the rates.
        <Card><CardBody className="pt-5 pb-5 flex flex-col gap-4">
          <div>
            <p className="text-base font-semibold text-foreground">Join the referral programme</p>
            <p className="mt-1 text-sm text-muted">
              Share your profile link or a code. When someone books their first session through it, the split changes in
              your favour. Until you join, bookings through your link pay the normal rate.
            </p>
          </div>
          <ProgrammeTerms />
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>I have read the programme terms above and agree to them.</span>
          </label>
          <div><Button variant="accent" size="sm" loading={joining} onClick={join}>Join the programme</Button></div>
          {data?.left_at && <p className="text-xs text-muted">You left the programme on {new Date(data.left_at).toLocaleDateString()}. Joining again starts fresh.</p>}
        </CardBody></Card>
      ) : (
        <>
          <p className="text-sm text-muted">
            Share your profile link or a code. When someone books their first session through either, you earn on that
            session, and a code also gives them the discount you set.
          </p>

          {/* Earnings in four buckets, so payout timing is never a surprise. */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Paid" value={inr(data?.paid_inr ?? 0)} hint="already sent" />
            <Stat label="Pending" value={inr(data?.pending_inr ?? 0)} hint="session done, next payout window" />
            <Stat label="Frozen" value={inr(data?.frozen_inr ?? 0)} hint="under review" />
            <Stat label="Not yet earned" value={String(data?.upcoming_count ?? 0)}
                  hint={`booked, session still to happen${(data?.upcoming_est_inr ?? 0) > 0 ? ` (about ${inr(data!.upcoming_est_inr)})` : ''}`} />
          </div>

          {/* The profile URL is the referral link. A visit that arrives on it from outside the site
              is credited to this mentor for 60 days. */}
          <Card><CardBody className="pt-4 pb-4 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Your referral link</p>
              <span className="text-xs text-muted">Joined {data?.enrolled_at ? new Date(data.enrolled_at).toLocaleDateString() : ''} · terms {data?.terms_version}</span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-brand-900 sm:text-sm">{profileUrl}</code>
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => copy(profileUrl)}>
                {copied === profileUrl ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied === profileUrl ? 'Copied' : 'Copy link'}
              </Button>
            </div>
            {shortUrl && (
              <p className="text-xs text-muted">
                Short form: <button type="button" onClick={() => copy(shortUrl)} className="font-mono text-brand-700 hover:underline">{shortUrl}</button>
                {copied === shortUrl && <span className="ml-1 text-green-600">copied</span>}
              </p>
            )}
            <p className="text-xs text-muted">
              Opened {data?.link_clicks ?? 0} {(data?.link_clicks ?? 0) === 1 ? 'time' : 'times'} from outside the site. A visit counts
              for 60 days. If the person enters someone else&rsquo;s code at checkout, that code takes precedence, and a booking
              that is cancelled loses its attribution.
            </p>
            <p className="text-xs text-muted">
              A customer you bring who books you: you keep 90% of the session price. A customer you bring to another mentor:
              you earn a promoter share of that session, about 10%.
            </p>
          </CardBody></Card>

          {/* Generate a code */}
          <Card><CardBody className="pt-4 pb-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-foreground">Generate a code</p>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Discount %" value={form.discount_pct} onChange={(v) => setForm((f) => ({ ...f, discount_pct: v }))} type="number" max={MAX_DISCOUNT} />
              <Field label="Usage limit" value={form.redemption_cap} onChange={(v) => setForm((f) => ({ ...f, redemption_cap: v }))} type="number" />
              <Field label="Expiry (optional)" value={form.expires_at} onChange={(v) => setForm((f) => ({ ...f, expires_at: v }))} type="date" />
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-muted">Session type</span>
                <select value={form.service_id} onChange={(e) => setForm((f) => ({ ...f, service_id: e.target.value }))}
                  className="h-9 w-44 rounded-lg bg-white px-2 text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none">
                  <option value="">Any of my sessions</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </label>
              <Button variant="accent" size="sm" loading={creating} onClick={createCode}><Plus className="h-4 w-4" /> Generate</Button>
            </div>
            <p className="text-xs text-muted">
              The code is generated for you. Up to {MAX_DISCOUNT}% off, one use per customer, a blank expiry defaults to 90 days.
              Your own code comes out of your share; it applies to the price the customer actually pays.
            </p>
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
                <span className="text-sm text-muted">{c.service_title ? c.service_title : 'Any session'}</span>
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

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[--color-border] pt-4">
            <details className="text-xs text-muted">
              <summary className="cursor-pointer text-brand-700 hover:underline">Programme terms</summary>
              <div className="mt-2"><ProgrammeTerms /></div>
            </details>
            <Button variant="outline" size="sm" loading={joining} onClick={leave}>Leave the programme</Button>
          </div>
        </>
      )}
    </div>
  );
}

// The rates and rules a mentor agrees to. Product copy for the join step; the rates are the v2
// referral logic (September 2026).
function ProgrammeTerms() {
  return (
    <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
      <li>Your profile link and your codes earn referral splits only after you join. Before that, bookings through them pay the normal rate.</li>
      <li>A customer you bring who books you: you keep 90% of the session price, Immigroov 10%. With your own code, that is 90% of the discounted price.</li>
      <li>A customer a promoter or another mentor brings you: you keep 70% of the session&rsquo;s list price, fixed. Their discount comes out of the other 30%, never out of yours.</li>
      <li>A customer you bring to another mentor: you earn a promoter share of that session, about 10%.</li>
      <li>Codes: up to 20% off, one use per customer, and every code has a usage limit and an expiry.</li>
      <li>Commission is earned only when the session happens. It is paid on the 1st and the 15th, at least five days after completion.</li>
      <li>A cancelled booking loses its attribution. A no-show keeps it for the rebooking. A referral counts for 60 days from the first visit.</li>
      <li>Flagged referrals are reviewed by hand before anything is paid.</li>
      <li>If you leave the programme, every open referral tied to you ends immediately.</li>
    </ul>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card><CardBody className="pt-4 pb-4">
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
      {hint && <p className="text-xs text-muted/70">{hint}</p>}
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
        className={`h-9 ${wide ? 'w-40' : 'w-28'} px-2 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(8,43,82,0.1)] focus:outline-none`} />
    </label>
  );
}