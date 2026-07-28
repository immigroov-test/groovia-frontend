'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { Button } from './ui/Button';
import { CurrencyRatesEditor } from './CurrencyRatesEditor';
import { type CurrencyRate } from '../lib/pricing';

// Mandatory first-login popup for a migrated mentor with no per-hour rate. It captures the same
// rate + additional currencies + fair-pricing a new mentor sets on the availability page, and
// applies it to their live profile so they become priceable. No dismiss - it blocks the hub.
export function FirstLoginRateModal() {
  const router = useRouter();
  const [currency, setCurrency] = useState('INR');
  const [baseRate, setBaseRate] = useState('');
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [smartPricing, setSmartPricing] = useState(false);
  const [saving, setSaving] = useState(false);
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
        setError(d.detail || 'Could not save. Please try again.');
        return;
      }
      router.refresh();   // reload the hub; the modal disappears now that hourly_rate is set
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div>
          <h2 className="text-xl font-semibold text-brand-900">Set your rate to go live</h2>
          <p className="text-sm text-muted mt-1">
            We imported your profile from immigroov.com. Before mentees can book you, set your hourly
            rate. You can add other currencies and turn on fair pricing (PPP) too.
          </p>
        </div>
        <CurrencyRatesEditor
          primaryCurrency={currency} onPrimaryCurrency={setCurrency}
          baseRate={baseRate} onBaseRate={setBaseRate}
          rates={rates} onRates={setRates}
          smartPricing={smartPricing} onSmartPricing={setSmartPricing}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button variant="accent" loading={saving} onClick={save}>Save &amp; continue</Button>
      </div>
    </div>
  );
}
