'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';
import { CountrySelect } from './ui/CountrySelect';
import { countryLabel } from '../lib/countries';

export interface CountryPricing {
  country_code: string; platform_fee_pct: number; tax_pct: number; tax_label: string | null;
}

function label(cc: string): string {
  return cc === 'DEFAULT' ? 'All other countries (default)' : `${countryLabel(cc)} (${cc})`;
}

// Live worked example from a base of 100, so the admin sees the effect of the numbers as they type.
// Tax is charged on the (base + fee) subtotal, not just the base - shown step by step so it's clear.
function Example({ fee, tax }: { fee: number; tax: number }) {
  const base = 100;
  const feeAmt = base * (fee || 0) / 100;
  const subtotal = base + feeAmt;
  const taxAmt = subtotal * (tax || 0) / 100;
  const total = subtotal + taxAmt;
  return (
    <p className="text-xs text-muted">
      Example: base <span className="font-medium text-foreground">100</span> + fee {fee || 0}% ({feeAmt.toFixed(2)})
      {' '}= {subtotal.toFixed(2)}, then tax {tax || 0}% of that ({taxAmt.toFixed(2)})
      {' '}= <span className="font-semibold text-foreground">{total.toFixed(2)}</span>
    </p>
  );
}

// Per-country platform fee + tax. Customer price = mentor rate x (1 + fee%) x (1 + tax%), by the
// customer's country. The DEFAULT row is the fallback for any country without its own entry.
export function AdminPricing() {
  const router = useRouter();
  const [rows, setRows] = useState<CountryPricing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [adding, setAdding] = useState({ country_code: '', platform_fee_pct: '5', tax_pct: '0', tax_label: '' });

  const authedFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data: { session } } = await createClient().auth.getSession();
    return fetch(url, { ...init, headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, ...(init?.headers ?? {}) }, cache: 'no-store' });
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await authedFetch('/api/admin/country-pricing');
      if (!res.ok) { setError('Could not load pricing.'); return; }
      setRows(await res.json());
    } catch { setError('Could not load pricing.'); }
  }, [authedFetch]);

  useEffect(() => { load(); }, [load]);

  async function save(r: CountryPricing) {
    setSaving(r.country_code); setError(null);
    try {
      const res = await authedFetch('/api/admin/country-pricing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.detail || 'Save failed.'); return; }
      setAdding({ country_code: '', platform_fee_pct: '5', tax_pct: '0', tax_label: '' });
      await load();
      router.refresh();   // keep the dashboard summary line in sync
    } catch { setError('Save failed.'); }
    finally { setSaving(null); }
  }

  function patch(cc: string, field: keyof CountryPricing, value: string) {
    setRows((rs) => (rs ?? []).map((r) => r.country_code === cc
      ? { ...r, [field]: field === 'tax_label' ? value : (parseFloat(value) || 0) } : r));
  }

  if (rows === null) return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  const existing = new Set(rows.map((r) => r.country_code));

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <Card key={r.country_code}><CardBody className="pt-4 pb-4 flex flex-col gap-2">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[150px] flex-1"><p className="text-sm font-semibold text-foreground">{label(r.country_code)}</p></div>
              <Field label="Platform fee %" type="number" value={String(r.platform_fee_pct)} onChange={(v) => patch(r.country_code, 'platform_fee_pct', v)} />
              <Field label="Tax %" type="number" value={String(r.tax_pct)} onChange={(v) => patch(r.country_code, 'tax_pct', v)} />
              <Field label="Tax label (optional)" type="text" value={r.tax_label ?? ''} placeholder="GST / VAT" onChange={(v) => patch(r.country_code, 'tax_label', v)} />
              <Button variant="primary" size="sm" loading={saving === r.country_code} onClick={() => save(r)}>Save</Button>
            </div>
            <Example fee={r.platform_fee_pct} tax={r.tax_pct} />
          </CardBody></Card>
        ))}
      </div>

      {/* Add a country */}
      <Card><CardBody className="pt-4 pb-4 flex flex-col gap-3">
        <p className="text-sm font-semibold text-foreground">Add a country</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <CountrySelect label="Country" value={adding.country_code}
              onChange={(code) => setAdding((a) => ({ ...a, country_code: code }))} placeholder="Search a country" />
          </div>
          <Field label="Platform fee %" type="number" value={adding.platform_fee_pct} onChange={(v) => setAdding((a) => ({ ...a, platform_fee_pct: v }))} />
          <Field label="Tax %" type="number" value={adding.tax_pct} onChange={(v) => setAdding((a) => ({ ...a, tax_pct: v }))} />
          <Field label="Tax label (optional)" type="text" value={adding.tax_label} placeholder="VAT" onChange={(v) => setAdding((a) => ({ ...a, tax_label: v }))} />
          <Button variant="accent" size="sm"
            disabled={!adding.country_code || existing.has(adding.country_code) || saving === adding.country_code}
            onClick={() => save({ country_code: adding.country_code, platform_fee_pct: parseFloat(adding.platform_fee_pct) || 0, tax_pct: parseFloat(adding.tax_pct) || 0, tax_label: adding.tax_label.trim() || null })}>
            <Plus className="h-4 w-4" /> Add to list
          </Button>
        </div>
        {existing.has(adding.country_code) && <p className="text-xs text-amber-700">That country already has a row above, edit it there.</p>}
        <Example fee={parseFloat(adding.platform_fee_pct) || 0} tax={parseFloat(adding.tax_pct) || 0} />
      </CardBody></Card>
    </div>
  );
}

function Field({ label, type, value, placeholder, onChange }: {
  label: string; type: 'number' | 'text'; value: string; placeholder?: string; onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted">{label}</span>
      <input type={type} {...(type === 'number' ? { min: 0, max: 100, step: 0.5 } : {})}
        value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="h-9 w-28 px-2 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none" />
    </label>
  );
}
