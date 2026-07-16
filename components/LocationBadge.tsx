'use client';
import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { detectLocation, countryName, type GeoLocation } from '../lib/geo';

// "You are here" chip for the home page, pinned top-left just under the logo.
// Resolves the visitor's location from the free IP-geo providers (timezone
// fallback) and renders nothing until it's known, so there's no flash of an
// empty/wrong value. Non-interactive (pointer-events-none) so it never blocks the
// UI beneath it.
export function LocationBadge() {
  const [loc, setLoc] = useState<GeoLocation | null>(null);

  useEffect(() => {
    let active = true;
    detectLocation().then((g) => { if (active && /^[A-Z]{2}$/.test(g.code)) setLoc(g); });
    return () => { active = false; };
  }, []);

  if (!loc) return null;
  const label = loc.city ? `${loc.city}, ${countryName(loc.code)}` : countryName(loc.code);

  return (
    <div className="fixed left-3 top-[4.5rem] z-30 sm:left-4 pointer-events-none">
      <span
        title={label}
        className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-white/80 px-2.5 py-1 text-xs font-medium text-brand-900 shadow-sm backdrop-blur"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-accent-500" aria-hidden />
        <span className="max-w-[45vw] truncate sm:max-w-none">{label}</span>
      </span>
    </div>
  );
}
