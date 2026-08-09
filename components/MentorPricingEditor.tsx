'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Button } from './ui/Button';
import { CurrencyRatesEditor } from './CurrencyRatesEditor';
import { type CurrencyRate } from '../lib/pricing';

// Live pricing editor for an approved mentor (BUG-074 + BUG-075): change the hourly rate, ADD more
// currencies, and toggle fair pricing - all applied immediately via /mentor/profile (no re-approval),
// which re-prices every paid session. Lives on the hub Profile tab.
export function MentorPricingEditor({
  initialCurrency = 'USD', initialRate = '', initialRates = [], initialSmartPricing = false, mentorCountry,
}: {
  initialCurrency?: string;
  initialRate?: string;
  initialRates?: CurrencyRate[];
  initialSmartPricing?: boolean;
  mentorCountry?: string;
}) {
  const [currency, setCurrency] = useState(initialCurrency);
  const [baseRate, setBaseRate] = useState(initialRate);
  const [rates, setRates] = useState<CurrencyRate[]>(initialRates);
  const [smartPricing, setSmartPricing] = useState(initialSmartPricing);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const rate = parseFloat(baseRate);
    if (!rate || rate <= 0) { setError('Enter your hourly rate.'); return; }
    setSaving(true); setError(null);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const res = await fetch('/api/mentor/profile', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hourly_rate: rate, currency, currency_rates: rates, smart_pricing: smartPricing }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || d.error || 'Could not save. Please try again.');
        setSaved(false);
        return;
      }
      setSaved(true);
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  }
  function markDirty() { if (saved) setSaved(false); }

  return (
    <div className="flex flex-col gap-4">
      <CurrencyRatesEditor
        primaryCurrency={currency} onPrimaryCurrency={(c) => { markDirty(); setCurrency(c); }}
        baseRate={baseRate} onBaseRate={(v) => { markDirty(); setBaseRate(v); }}
        rates={rates} onRates={(r) => { markDirty(); setRates(r); }}
        smartPricing={smartPricing} onSmartPricing={(v) => { markDirty(); setSmartPricing(v); }}
        mentorCountry={mentorCountry}
      />
      <p className="text-xs text-muted">
        Changes apply immediately and update the price of every paid session. Your free intro call stays free.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button variant="accent" loading={saving} onClick={save} className="self-start">Save pricing</Button>
        {saved && !saving && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-700"><Check className="h-4 w-4" /> Saved</span>
        )}
      </div>
    </div>
  );
}
