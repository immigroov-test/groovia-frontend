'use client';
import { useState } from 'react';
import { Plus, Trash2, Info, Eye } from 'lucide-react';
import { Toggle } from './ui/Toggle';
import { Flag } from './ui/Flag';
import { CurrencySelect } from './CurrencySelect';
import { CURRENCIES, currencySymbol, currencyCountry, type CurrencyRate } from '../lib/pricing';
import { PricePreviewTable } from './PricePreviewTable';

// Multi-currency rate setup (BUG-042): a base currency + base hourly rate, an optional list of exact
// per-currency rates, and the smart-pricing (PPP) toggle. Each service's price is derived from these by
// duration. Shared by onboarding + hub + profile edit. Flow: base rate -> optional exact per-currency
// rates -> live market preview -> smart pricing.
export function CurrencyRatesEditor({
  primaryCurrency, onPrimaryCurrency, baseRate, onBaseRate, rates, onRates, smartPricing, onSmartPricing,
  preview = 'open',
}: {
  primaryCurrency: string;
  onPrimaryCurrency: (c: string) => void;
  baseRate: string;
  onBaseRate: (v: string) => void;
  rates: CurrencyRate[];
  onRates: (r: CurrencyRate[]) => void;
  smartPricing: boolean;
  onSmartPricing: (v: boolean) => void;
  /**
   * How prominent the market preview is. 'open' when the mentor is deciding a rate for the first
   * time (onboarding) and needs to see the effect; 'collapsed' on the dashboard, where they already
   * have a rate and the 7-tile grid is noise sitting permanently under their profile; 'off' where it
   * isn't relevant at all. One switch here rather than a different pricing block per page.
   */
  preview?: 'open' | 'collapsed' | 'off';
}) {
  const [previewOpen, setPreviewOpen] = useState(preview === 'open');
  const used = new Set([primaryCurrency, ...rates.map((r) => r.currency)]);
  const available = CURRENCIES.filter((c) => !used.has(c.code));

  const rateInput = 'h-11 px-3 rounded-xl bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]';

  function setRate(i: number, patch: Partial<CurrencyRate>) {
    onRates(rates.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRate() {
    const next = available[0];
    if (next) onRates([...rates, { currency: next.code, hourly_rate: 0 }]);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Base currency, then base rate (symbol/flag sit in their own segment so they never overlap).
          Both fields share one grid so the rate box is exactly as wide as the currency box. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Base currency</label>
          <CurrencySelect value={primaryCurrency} onChange={onPrimaryCurrency} className="w-full" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Base rate (per hour)</label>
          <div className="flex items-stretch w-full rounded-xl bg-white overflow-hidden shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus-within:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]">
            <span className="pl-2.5 pr-2.5 flex items-center gap-1.5 text-sm border-r border-[--color-border] bg-brand-50/50 select-none">
              <Flag code={currencyCountry(primaryCurrency)} className="w-4 h-auto rounded-[1px] shrink-0" />
              <span className="text-foreground">{currencySymbol(primaryCurrency)}</span>
            </span>
            <input type="number" min={0} step="0.01" inputMode="decimal" value={baseRate} onChange={(e) => onBaseRate(e.target.value)}
              placeholder="e.g. 2000" className="flex-1 min-w-0 w-full px-3 bg-transparent text-sm focus:outline-none" />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted leading-relaxed">
        Your <span className="font-medium text-foreground">base rate</span>. {primaryCurrency} customers pay it directly;
        everyone else&apos;s price is worked out from it, split by session length.
      </p>

      {/* Optional: fix an exact amount for a specific currency instead of the smart-pricing estimate. */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">
          Set an exact price for another currency <span className="font-normal text-muted">(optional)</span>
        </span>
        <p className="text-xs text-muted leading-relaxed">
          Want to fix an exact amount for a currency instead of the estimate below? Add it here. Anyone whose
          currency you don&apos;t set stays priced from your base {primaryCurrency} rate.
        </p>
        {rates.map((r, i) => (
          <div key={i} className="flex items-end gap-2">
            <CurrencySelect value={r.currency} onChange={(code) => setRate(i, { currency: code })}
              options={CURRENCIES.filter((c) => c.code === r.currency || !used.has(c.code)).map((c) => c.code)}
              className="w-52" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted w-10 text-right shrink-0">{currencySymbol(r.currency)}</span>
              <input type="number" min={0} step="0.01" value={r.hourly_rate || ''}
                onChange={(e) => setRate(i, { hourly_rate: parseFloat(e.target.value) || 0 })}
                placeholder="per hour" className={`${rateInput} w-28`} />
            </div>
            <button type="button" onClick={() => onRates(rates.filter((_, idx) => idx !== i))} aria-label="Remove currency"
              className="h-11 w-11 flex items-center justify-center rounded-xl text-muted hover:text-red-600 hover:bg-red-50">
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        ))}
        {available.length > 0 && (
          <button type="button" onClick={addRate}
            className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900 w-fit mt-1">
            <Plus className="h-4 w-4" /> Add another currency
          </button>
        )}
      </div>

      {/* BUG-62: live preview of what customers in our key markets see for this base rate. Moves down as
          exact-currency rows are added above. Collapsed on pages where the rate already exists. */}
      {preview !== 'off' && (
        preview === 'collapsed' && !previewOpen ? (
          <button type="button" onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900 w-fit">
            <Eye className="h-4 w-4" /> See what customers in other markets pay
          </button>
        ) : (
          <PricePreviewTable baseRate={baseRate} currency={primaryCurrency} smartPricing={smartPricing} />
        )
      )}

      {/* Smart pricing - controls the market preview above. Intentionally vague on the method. */}
      <label className="flex items-start justify-between gap-3 rounded-lg border border-[--color-border] p-3 cursor-pointer">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Smart pricing</p>
          <p className="text-xs text-muted mt-0.5">
            Let Immigroov adjust what customers pay based on their market, helping more of them book you.
          </p>
          <p className="text-xs text-muted mt-1 flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-px shrink-0 text-brand-500" aria-hidden="true" />
            <span>Your session rate is never lowered, it stays fixed in the currency you set it in.</span>
          </p>
        </div>
        <Toggle checked={smartPricing} onChange={onSmartPricing} aria-label="Smart pricing" />
      </label>
    </div>
  );
}
