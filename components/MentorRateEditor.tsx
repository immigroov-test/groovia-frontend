'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { CurrencyRatesEditor } from './CurrencyRatesEditor';
import { type CurrencyRate } from '../lib/pricing';

// Per-hour rate + currencies + smart pricing, for a migrated mentor's first-login onboarding. There are
// NO buttons: changes auto-save (debounced) via /mentor/setup-rate, and when the RATE changes the
// sessions are re-priced automatically (apply_to_sessions), so "Save rate" / "Update my session prices"
// are gone. Calls onSaved(true) once a valid rate is stored so the parent can unlock "Finish setup".
export function MentorRateEditor({
  initialCurrency = 'INR', initialRate = '', initialRates = [], initialSmartPricing = true, onSaved,
  autosaveInitial = false,
}: {
  initialCurrency?: string;
  initialRate?: string;
  initialRates?: CurrencyRate[];
  initialSmartPricing?: boolean;
  /** Reports the stored rate, not just that one exists, so a parent can price things with it. */
  onSaved?: (saved: boolean, rate?: number, currency?: string) => void;
  /** Persist the prefilled rate on mount instead of waiting for an edit. Used for migrated mentors,
   *  whose starting rate is derived from their imported sessions: if they never touch the field, the
   *  number they were shown was never actually stored and their sessions stay unpriced. */
  autosaveInitial?: boolean;
}) {
  const [currency, setCurrency] = useState(initialCurrency);
  const [baseRate, setBaseRate] = useState(initialRate);
  const [rates, setRates] = useState<CurrencyRate[]>(initialRates);
  const [smartPricing, setSmartPricing] = useState(initialSmartPricing);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    !!initialRate && parseFloat(initialRate) > 0 ? 'saved' : 'idle');
  const [error, setError] = useState<string | null>(null);

  const firstRun = useRef(true);
  const rateSig = () => JSON.stringify([baseRate, currency, rates]);   // the "rate" part (not the SP flag)
  const lastRateSig = useRef<string | null>(null);
  const onSavedRef = useRef(onSaved);
  useEffect(() => { onSavedRef.current = onSaved; });

  // Auto-save whenever the rate / currency / SP changes, debounced so it fires once the mentor stops
  // typing. Re-price the sessions only when the RATE actually changed (not on a plain SP toggle).
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      const r0 = parseFloat(baseRate);
      // Normally the first render only reports what is already stored. With autosaveInitial we fall
      // through to the save below instead, so a derived prefill is committed without the mentor
      // having to retype the same number. lastRateSig stays empty so it counts as a change.
      if (!(autosaveInitial && r0 > 0)) {
        lastRateSig.current = rateSig();
        onSavedRef.current?.(!!r0 && r0 > 0, r0 || undefined, currency);   // a seeded valid rate already unlocks "Finish setup"
        return;
      }
    }
    const rate = parseFloat(baseRate);
    if (!rate || rate <= 0) { setStatus('idle'); onSavedRef.current?.(false); return; }
    const sig = rateSig();
    const rateChanged = sig !== lastRateSig.current;
    let cancelled = false;
    setStatus('saving'); onSavedRef.current?.(false);
    const t = setTimeout(async () => {
      try {
        const { data: { session } } = await createClient().auth.getSession();
        const res = await fetch('/api/mentor/setup-rate', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hourly_rate: rate, currency, currency_rates: rates, smart_pricing: smartPricing,
            apply_to_sessions: rateChanged,
          }),
        });
        if (cancelled) return;
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.detail || d.error || 'Could not save your rate. Please try again.');
          setStatus('error'); onSavedRef.current?.(false);
          return;
        }
        lastRateSig.current = sig;
        setError(null); setStatus('saved'); onSavedRef.current?.(true, rate, currency);
      } catch {
        if (!cancelled) { setError('Could not reach the server. Please try again.'); setStatus('error'); onSavedRef.current?.(false); }
      }
    }, 800);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseRate, currency, rates, smartPricing]);

  return (
    <div className="flex flex-col gap-3">
      <CurrencyRatesEditor
        primaryCurrency={currency} onPrimaryCurrency={setCurrency}
        baseRate={baseRate} onBaseRate={setBaseRate}
        rates={rates} onRates={setRates}
        smartPricing={smartPricing} onSmartPricing={setSmartPricing}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="h-5 text-sm">
        {status === 'saving' && (
          <span className="inline-flex items-center gap-1.5 text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Saving…</span>
        )}
        {status === 'saved' && (
          <span className="inline-flex items-center gap-1.5 text-emerald-700">
            <Check className="h-4 w-4" /> Saved. Your session prices update automatically from this rate.
          </span>
        )}
      </div>
    </div>
  );
}
