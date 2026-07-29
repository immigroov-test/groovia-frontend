'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Button } from './ui/Button';
import { CurrencyRatesEditor } from './CurrencyRatesEditor';
import { type CurrencyRate } from '../lib/pricing';

// Per-hour rate + additional currencies + fair pricing, saved live via /mentor/setup-rate. Used on
// the availability page during a migrated mentor's first-login onboarding (the rate the popup used
// to ask for now lives here). Calls onSaved(true) once a valid rate is stored so the parent can
// unlock the "Finish setup" button.
export function MentorRateEditor({
  initialCurrency = 'INR', initialRate = '', initialRates = [], initialSmartPricing = false, onSaved,
}: {
  initialCurrency?: string;
  initialRate?: string;
  initialRates?: CurrencyRate[];
  initialSmartPricing?: boolean;
  onSaved?: (saved: boolean) => void;
}) {
  const [currency, setCurrency] = useState(initialCurrency);
  const [baseRate, setBaseRate] = useState(initialRate);
  const [rates, setRates] = useState<CurrencyRate[]>(initialRates);
  const [smartPricing, setSmartPricing] = useState(initialSmartPricing);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!initialRate && parseFloat(initialRate) > 0);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const rate = parseFloat(baseRate);
    if (!rate || rate <= 0) { setError('Enter your hourly rate to continue.'); return; }
    setSaving(true); setError(null);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const res = await fetch('/api/mentor/setup-rate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hourly_rate: rate, currency, currency_rates: rates, smart_pricing: smartPricing }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || d.error || 'Could not save your rate. Please try again.');
        setSaved(false); onSaved?.(false);
        return;
      }
      setSaved(true); onSaved?.(true);
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // Editing after a save invalidates it until re-saved, so the parent's Finish button re-locks.
  function markDirty() { if (saved) { setSaved(false); onSaved?.(false); } }

  return (
    <div className="flex flex-col gap-4">
      <CurrencyRatesEditor
        primaryCurrency={currency} onPrimaryCurrency={(c) => { markDirty(); setCurrency(c); }}
        baseRate={baseRate} onBaseRate={(v) => { markDirty(); setBaseRate(v); }}
        rates={rates} onRates={(r) => { markDirty(); setRates(r); }}
        smartPricing={smartPricing} onSmartPricing={(v) => { markDirty(); setSmartPricing(v); }}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button variant={saved ? 'outline' : 'accent'} loading={saving} onClick={save}>
          {saved ? 'Update rate' : 'Save rate'}
        </Button>
        {saved && !saving && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
            <Check className="h-4 w-4" /> Rate saved
          </span>
        )}
      </div>
    </div>
  );
}
