'use client';
import { useEffect, useState } from 'react';

// Minimum allowed base rate per currency. The floor is one INR figure converted on the backend, so a
// mentor pricing in any currency faces the same real limit rather than "100 of whatever unit". Cached
// per currency for the life of the page; these move with FX, not with keystrokes.
export function useMinRates(currencies: string[]): Record<string, number> {
  const [mins, setMins] = useState<Record<string, number>>({});
  const wanted = Array.from(new Set(currencies.map((c) => (c || '').toUpperCase()).filter(Boolean)));
  const key = wanted.join(',');

  useEffect(() => {
    let cancelled = false;
    const missing = wanted.filter((c) => !(c in mins));
    if (missing.length === 0) return;
    (async () => {
      const found: Record<string, number> = {};
      await Promise.all(missing.map(async (c) => {
        try {
          const res = await fetch(`/api/pricing/min-rate?currency=${encodeURIComponent(c)}`);
          const d = await res.json();
          // fx_ok false means we could not convert, so we impose no floor rather than a wrong one.
          if (res.ok && d.fx_ok && typeof d.min === 'number') found[c] = d.min;
        } catch { /* leave unset: no floor shown */ }
      }));
      if (!cancelled && Object.keys(found).length) setMins((m) => ({ ...m, ...found }));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return mins;
}
