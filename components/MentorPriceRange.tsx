'use client';
import { useEffect, useState } from 'react';
import { pricingCountry } from '../lib/geo';

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

// Same localized display pricing the mentor cards use, reduced to the cheapest and priciest
// "from" price across mentors.
export function MentorPriceRange({ serviceIds }: { serviceIds: string[] }) {
  const [range, setRange] = useState<{ min: number; max: number; currency: string } | null>(null);
  const [done, setDone] = useState(serviceIds.length === 0);

  useEffect(() => {
    if (serviceIds.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const country = await pricingCountry();
        const res = await fetch('/api/pricing/display', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: country ?? null, service_ids: serviceIds }),
        });
        if (!res.ok || cancelled) return;
        const prices: { you: number; customer_currency: string }[] = (await res.json()).prices ?? [];
        const currency = prices[0]?.customer_currency;
        const amounts = prices.filter((p) => p.customer_currency === currency && p.you > 0).map((p) => p.you);
        if (currency && amounts.length) setRange({ min: Math.min(...amounts), max: Math.max(...amounts), currency });
      } catch { /* fall back to the generic label */ }
      finally { if (!cancelled) setDone(true); }
    })();
    return () => { cancelled = true; };
  }, [serviceIds]);

  if (!done) return <span className="mt-3 block h-9 w-48 animate-pulse rounded-lg bg-brand-50" aria-hidden />;
  if (!range) return <p className="font-display mt-3 text-[1.75rem] font-bold leading-tight text-brand-900">Set by each mentor</p>;

  const min = money(range.min, range.currency);
  const max = money(range.max, range.currency);
  return (
    <p className="font-display mt-3 text-[1.75rem] font-bold leading-tight text-brand-900">
      {min === max ? min : <>{min} <span className="text-muted font-semibold">–</span> {max}</>}
    </p>
  );
}
