'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';
import { countryLabel } from '../lib/countries';

export interface CountryPricing {
  country_code: string; platform_fee_pct: number; tax_pct: number; tax_label: string | null;
}

function label(cc: string): string {
  return cc === 'DEFAULT' ? 'All other countries (default)' : `${countryLabel(cc)} (${cc})`;
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

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Customer price = mentor rate + platform fee + tax, by the customer&apos;s country. The DEFAULT
        row applies to any country without its own entry. A per-mentor commission override still wins.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <Card key={r.country_code}><CardBody className="pt-4 pb-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[150px] flex-1"><p className="text-sm font-semibold text-foreground">{label(r.country_code)}</p></div>
            <Field label="Platform fee %" type="number" value={String(r.platform_fee_pct)} onChange={(v) => patch(r.country_code, 'platform_fee_pct', v)} />
            <Field label="Tax %" type="number" value={String(r.tax_pct)} onChange={(v) => patch(r.country_code, 'tax_pct', v)} />
            <Field label="Tax label" type="text" value={r.tax_label ?? ''} placeholder="GST / VAT" onChange={(v) => patch(r.country_code, 'tax_label', v)} />
            <Button variant="primary" size="sm" loading={saving === r.country_code} onClick={() => save(r)}>Save</Button>
          </CardBody></Card>
        ))}
      </div>

      <Card><CardBody className="pt-4 pb-4 flex flex-wrap items-end gap-3">
        <Field label="Country (ISO-2)" type="text" value={adding.country_code} placeholder="e.g. GB"
          onChange={(v) => setAdding((a) => ({ ...a, country_code: v.toUpperCase().slice(0, 2) }))} />
        <Field label="Platform fee %" type="number" value={adding.platform_fee_pct} onChange={(v) => setAdding((a) => ({ ...a, platform_fee_pct: v }))} />
        <Field label="Tax %" type="number" value={adding.tax_pct} onChange={(v) => setAdding((a) => ({ ...a, tax_pct: v }))} />
        <Field label="Tax label" type="text" value={adding.tax_label} placeholder="VAT" onChange={(v) => setAdding((a) => ({ ...a, tax_label: v }))} />
        <Button variant="accent" size="sm" disabled={adding.country_code.trim().length !== 2 || saving === adding.country_code.toUpperCase()}
          onClick={() => save({ country_code: adding.country_code, platform_fee_pct: parseFloat(adding.platform_fee_pct) || 0, tax_pct: parseFloat(adding.tax_pct) || 0, tax_label: adding.tax_label.trim() || null })}>
          <Plus className="h-4 w-4" /> Add country
        </Button>
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
