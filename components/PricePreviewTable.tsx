'use client';
import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { Flag } from './ui/Flag';
import { currencySymbol, currencyName, currencyCountry } from '../lib/pricing';

// BUG-62: shows the mentor what a customer in each key market sees for their base rate. FX + PPP
// (anchored to the pricing currency) when Smart Pricing is on; plain FX when off. No column headers,
// just tiles (flag + currency full name + price); recomputes as the rate, currency, or SP toggle
// change. Responsive (2 cols on phones, 3 on wider screens) so it never looks out of place.
interface Market { country_code: string; currency: string; price: number; fx_ok: boolean; }

export function PricePreviewTable({ baseRate, currency, smartPricing }: {
  baseRate: string; currency: string; smartPricing: boolean;
}) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);
  const rate = parseFloat(baseRate);

  useEffect(() => {
    if (!rate || rate <= 0) { setMarkets([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/pricing/preview', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: rate, currency, smart_pricing: smartPricing }),
        });
        const d = await res.json().catch(() => ({}));
        if (!cancelled) setMarkets(res.ok ? (d.markets ?? []) : []);
      } catch { if (!cancelled) setMarkets([]); }
      finally { if (!cancelled) setLoading(false); }
    }, 350);   // debounce while the mentor types
    return () => { cancelled = true; clearTimeout(t); };
  }, [rate, currency, smartPricing]);

  if (!rate || rate <= 0 || markets.length === 0) return null;

  return (
    <div className="rounded-xl border border-[--color-border] bg-brand-50/40 p-4">
      <p className="flex items-start gap-1.5 text-xs text-muted mb-3">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-brand-500" aria-hidden="true" />
        <span>
          What customers elsewhere are shown for this rate
          {smartPricing ? ', adjusted for their local market' : ' (currency conversion only)'}.
          {loading && <span className="opacity-60"> updating…</span>}
        </span>
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {markets.map((m) => (
          <div key={m.country_code}
            className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-[0_0_0_1px_rgba(15,23,42,0.06)]">
            <Flag code={currencyCountry(m.currency)} className="w-5 h-auto rounded-[2px] shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted leading-tight truncate">{currencyName(m.currency)}</p>
              <p className="text-sm font-semibold text-brand-900 leading-tight">
                {currencySymbol(m.currency)}{m.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
