'use client';
import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { detectLocation, countryName, type GeoLocation } from '../lib/geo';

// "You are here" row shown at the bottom of the nav menu. Uses the same edge geo as
// pricing, and renders nothing until it resolves so there's no flash of an empty value.
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
    <div className="mt-1 flex items-center gap-2 border-t border-[--color-border] px-3 pt-3 pb-1 text-xs text-muted">
      <MapPin className="h-4 w-4 shrink-0 text-accent-500" aria-hidden />
      <span className="truncate" title={label}>{label}</span>
    </div>
  );
}
