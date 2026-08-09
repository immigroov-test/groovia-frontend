'use client';
import { useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Button } from './ui/Button';
import { CurrencyRatesEditor } from './CurrencyRatesEditor';
import { type CurrencyRate } from '../lib/pricing';

// Per-hour rate + additional currencies + fair pricing, saved live via /mentor/setup-rate. Used on the
// availability page during a migrated mentor's first-login onboarding. Calls onSaved(true) once a valid
// rate is stored so the parent can unlock "Finish setup".
//
// Two distinct actions, because a migrated mentor arrives with their REAL per-session prices restored
// (a cheap 15-min intro next to a pricier 30-min), which a single per-hour rate can't reproduce:
//   - "Save rate": stores the rate (the seeded default) WITHOUT touching session prices.
//   - "Update my session prices": the explicit opt-in that reprices every session to rate x length.
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
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(applyToSessions: boolean): Promise<boolean> {
    const rate = parseFloat(baseRate);
    if (!rate || rate <= 0) { setError('Enter your hourly rate to continue.'); return false; }
    const { data: { session } } = await createClient().auth.getSession();
    const res = await fetch('/api/mentor/setup-rate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hourly_rate: rate, currency, currency_rates: rates, smart_pricing: smartPricing,
        apply_to_sessions: applyToSessions,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.detail || d.error || 'Could not save your rate. Please try again.');
      return false;
    }
    return true;
  }

  async function save() {
    setSaving(true); setError(null); setApplied(false);
    const ok = await post(false);
    setSaved(ok); onSaved?.(ok);
    setSaving(false);
  }

  async function applyToSessions() {
    setApplying(true); setError(null); setConfirming(false);
    const ok = await post(true);
    if (ok) { setSaved(true); onSaved?.(true); setApplied(true); }
    setApplying(false);
  }

  // Editing after a save invalidates it until re-saved, so the parent's Finish button re-locks.
  function markDirty() { if (saved) { setSaved(false); onSaved?.(false); } setApplied(false); setConfirming(false); }

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

      {/* Explicit, opt-in reprice. Your imported session prices are kept until you choose this. */}
      <div className="rounded-xl border border-[--color-border] bg-brand-50/40 p-4 flex flex-col gap-3">
        <p className="text-sm text-muted">
          Your existing session prices are kept exactly as they were. To set every session from this rate
          instead (price = rate × the session’s length), update them here.
        </p>
        {!confirming ? (
          <Button variant="outline" size="sm" onClick={() => setConfirming(true)} disabled={applying} className="self-start">
            <RefreshCw className="h-4 w-4" /> Update my session prices
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-amber-900">
              This replaces every paid session’s price with your rate × its length (a 30-min session becomes
              half your hourly rate). Your free intro stays free. Continue?
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" loading={applying} onClick={applyToSessions}>Yes, update prices</Button>
              <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={applying}>Cancel</Button>
            </div>
          </div>
        )}
        {applied && !applying && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
            <Check className="h-4 w-4" /> Session prices updated
          </span>
        )}
      </div>
    </div>
  );
}
