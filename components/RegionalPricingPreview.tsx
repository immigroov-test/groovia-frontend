'use client';
import { useEffect, useRef, useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { Flag } from './ui/Flag';
import { currencySymbol } from '../lib/pricing';

interface RegionPrice {
  region_code: string;
  currency: string;
  price: number;
  price_no_ppp: number;
  fx_ok: boolean;
}

// BUG-103/FEAT: featured-region reference, NOT the full list of countries/currencies the platform
// actually prices for (that's the whole point - all countries stay covered by the real
// country/currency + PPP mapping, this is just a quick preview for the mentor).
const FEATURED_REGIONS: { code: string; label: string; flag: string | null }[] = [
  { code: 'US', label: 'USA', flag: 'US' },
  { code: 'EU', label: 'Europe', flag: null },
  { code: 'IN', label: 'India', flag: 'IN' },
  { code: 'SA', label: 'Saudi Arabia', flag: 'SA' },
  { code: 'AE', label: 'Dubai/UAE', flag: 'AE' },
  { code: 'AU', label: 'Australia', flag: 'AU' },
  { code: 'SG', label: 'Singapore', flag: 'SG' },
];

function formatPrice(amount: number, currency: string): string {
  const symbol = currencySymbol(currency);
  const rounded = Math.round(amount) === amount ? amount : Math.round(amount * 100) / 100;
  return `${symbol}${rounded.toLocaleString()}`;
}

// Regional pricing preview shown directly below the Base Currency selector (BUG-103): "if I set
// this base price in this currency, approximately what will customers in major markets see?" Uses
// the SAME PPP+FX engine as checkout (via /pricing/preview-regions), so it never drifts from what a
// mentee is actually shown. Recalculates on every base price / currency / smart-pricing change.
export function RegionalPricingPreview({
  baseCurrency, basePrice, smartPricing,
}: {
  baseCurrency: string;
  basePrice: string;
  smartPricing: boolean;
}) {
  const [regions, setRegions] = useState<RegionPrice[] | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const price = parseFloat(basePrice);
    // Nothing to fetch yet - the component itself renders nothing below until a valid price
    // exists, so stale `regions` state here is harmless (never shown).
    if (!price || price <= 0 || !baseCurrency) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/pricing/preview-regions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base_currency: baseCurrency,
            base_price: price,
            smart_pricing: smartPricing,
          }),
        });
        if (!res.ok) { setRegions(null); return; }
        const data = await res.json();
        setRegions(data.regions ?? null);
      } catch {
        setRegions(null);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [baseCurrency, basePrice, smartPricing]);

  const price = parseFloat(basePrice);
  if (!price || price <= 0) return null;

  const byRegion = new Map((regions ?? []).map((r) => [r.region_code, r]));

  return (
    <div className="rounded-xl border border-[--color-border] bg-neutral-50/60 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
          Approximate regional prices
        </p>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />}
      </div>
      <p className="text-xs text-muted -mt-1">
        {smartPricing
          ? 'Approximate PPP-adjusted prices — what customers in these major markets will see with fair pricing on.'
          : 'Approximate currency-converted prices — no fair-pricing adjustment applied.'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {FEATURED_REGIONS.map((r) => {
          const row = byRegion.get(r.code);
          return (
            <div key={r.code} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 text-muted">
                {r.flag ? <Flag code={r.flag} className="w-4 h-auto rounded-[1px]" /> : <Globe className="h-3.5 w-3.5" />}
                {r.label}
              </span>
              <span className="font-medium text-foreground tabular-nums">
                {row ? formatPrice(row.price, row.currency) : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted leading-relaxed">
        Prices shown are approximate and may vary based on exchange rates and, when Smart pricing is
        enabled, PPP data. These 7 markets are featured references — every other country you&apos;re
        priced for still follows the full currency + fair-pricing mapping.
      </p>
    </div>
  );
}
