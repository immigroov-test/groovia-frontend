'use client';
import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { detectLocation, countryName, type GeoLocation } from '../lib/geo';

// "You are here" chip that sits under the logo in the top nav (home page only).
// Uses the same edge geo as pricing, and renders nothing until it resolves so
// there's no flash of an empty/wrong value.
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
    <span
      title={label}
      className="flex min-w-0 max-w-full items-center gap-1 leading-none text-[10px] font-medium text-brand-900/70"
    >
      <MapPin className="h-2.5 w-2.5 shrink-0 text-accent-500" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
