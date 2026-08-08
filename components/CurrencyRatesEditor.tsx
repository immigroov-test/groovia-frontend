'use client';
import { Plus, Trash2 } from 'lucide-react';
import { Toggle } from './ui/Toggle';
import { Flag } from './ui/Flag';
import { CURRENCIES, TOP_CURRENCIES, currencySymbol, type CurrencyRate } from '../lib/pricing';

// Multi-currency rate setup (BUG-042): a base currency (default INR) + base hourly rate, an optional
// list of additional-currency rates for foreign customers, and the smart-pricing (PPP) toggle. Each
// service's price is derived from these by duration. Shared by onboarding + hub + profile edit.
export function CurrencyRatesEditor({
  primaryCurrency, onPrimaryCurrency, baseRate, onBaseRate, rates, onRates, smartPricing, onSmartPricing,
}: {
  primaryCurrency: string;
  onPrimaryCurrency: (c: string) => void;
  baseRate: string;
  onBaseRate: (v: string) => void;
  rates: CurrencyRate[];
  onRates: (r: CurrencyRate[]) => void;
  smartPricing: boolean;
  onSmartPricing: (v: boolean) => void;
}) {
  const used = new Set([primaryCurrency, ...rates.map((r) => r.currency)]);
  const available = CURRENCIES.filter((c) => !used.has(c.code));

  const rateInput = 'h-11 px-3 rounded-xl bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]';
  const selectCls = 'h-11 px-3 rounded-xl bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]';

  function setRate(i: number, patch: Partial<CurrencyRate>) {
    onRates(rates.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRate() {
    const next = available[0];
    if (next) onRates([...rates, { currency: next.code, hourly_rate: 0 }]);
  }
  function addTopCurrency(code: string) {
    if (used.has(code)) return;
    onRates([...rates, { currency: code, hourly_rate: 0 }]);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Base currency FIRST, then the base rate. */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Base currency</label>
          <select value={primaryCurrency} onChange={(e) => onPrimaryCurrency(e.target.value)} className={selectCls}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Base rate (per hour)</label>
          <div className="relative w-40">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none">{currencySymbol(primaryCurrency)}</span>
            <input type="number" min={0} step="0.01" inputMode="decimal" value={baseRate} onChange={(e) => onBaseRate(e.target.value)}
              placeholder="e.g. 2000" className={`${rateInput} w-full pl-8`} />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted leading-relaxed">
        Your <span className="font-medium text-foreground">base rate</span>. {primaryCurrency} customers pay it directly;
        everyone else&apos;s price is calculated from it, split by session length.
      </p>

      {/* Top 5 markets: one click adds a fixed rate for that currency below, instead of hunting
          through the full "Add another currency" dropdown. */}
      {TOP_CURRENCIES.some((t) => !used.has(t.currency)) && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Quick add: top markets</span>
          <div className="flex flex-wrap gap-2">
            {TOP_CURRENCIES.filter((t) => !used.has(t.currency)).map((t) => (
              <button key={t.currency} type="button" onClick={() => addTopCurrency(t.currency)}
                className="flex items-center gap-1.5 h-9 pl-2 pr-3 rounded-full bg-white text-sm font-medium text-foreground shadow-[0_0_0_1px_rgba(15,23,42,0.08)] hover:shadow-[0_0_0_1px_rgba(29,78,216,0.4)]">
                <Flag code={t.country} className="w-4 h-auto rounded-[1px]" />
                {t.currency}
                <Plus className="h-3.5 w-3.5 text-muted" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Additional currencies for foreign customers. */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">
          Other currencies <span className="font-normal text-muted">(optional)</span>
        </span>
        <p className="text-xs text-muted leading-relaxed">
          Set an exact rate for another currency&apos;s customers. Anyone whose currency you don&apos;t set is priced
          from your base {primaryCurrency} rate.
        </p>
        {rates.map((r, i) => (
          <div key={i} className="flex items-end gap-2">
            <select value={r.currency} onChange={(e) => setRate(i, { currency: e.target.value })} className={selectCls}>
              {/* the row's own currency + any not-yet-used ones */}
              {CURRENCIES.filter((c) => c.code === r.currency || !used.has(c.code)).map((c) => (
                <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted w-8 text-right">{currencySymbol(r.currency)}</span>
              <input type="number" min={0} step="0.01" value={r.hourly_rate || ''}
                onChange={(e) => setRate(i, { hourly_rate: parseFloat(e.target.value) || 0 })}
                placeholder="per hour" className={`${rateInput} w-32`} />
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

      {/* Smart pricing (PPP) */}
      <label className="flex items-start justify-between gap-3 rounded-lg border border-[--color-border] p-3 cursor-pointer">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Smart pricing</p>
          <p className="text-xs text-muted mt-0.5">
            Adjusts auto-converted prices to each country&apos;s cost of living (PPP), so they feel fair. Never
            changes the rates you set.
          </p>
        </div>
        <Toggle checked={smartPricing} onChange={onSmartPricing} aria-label="Smart pricing" />
      </label>
    </div>
  );
}
