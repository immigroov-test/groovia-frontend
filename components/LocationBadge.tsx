'use client';
import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { detectLocation, countryName, type GeoLocation } from '../lib/geo';

// "You are here" indicator. `inline` = a compact chip for the desktop nav (next to
// the logo); `menu` (default) = a full row at the bottom of the mobile menu. Uses the
// same auto-detected edge geo as pricing, and renders nothing until it resolves (no flash).
// Display only: the visitor cannot change it, so what's shown always matches what's charged.
export function LocationBadge({ variant = 'menu' }: { variant?: 'inline' | 'menu' }) {
  const [loc, setLoc] = useState<GeoLocation | null>(null);

  useEffect(() => {
    let active = true;
    detectLocation().then((g) => { if (active && /^[A-Z]{2}$/.test(g.code)) setLoc(g); });
    return () => { active = false; };
  }, []);

  if (!loc) return null;
  const label = loc.city ? `${loc.city}, ${countryName(loc.code)}` : countryName(loc.code);

  if (variant === 'inline') {
    return (
      <span title={label} className="inline-flex min-w-0 max-w-[200px] items-center gap-1 text-xs font-medium text-muted">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-accent-500" aria-hidden />
        <span className="truncate">{label}</span>
      </span>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-2 border-t border-[--color-border] px-3 pt-3 pb-1 text-xs text-muted">
      <MapPin className="h-4 w-4 shrink-0 text-accent-500" aria-hidden />
      <span className="truncate" title={label}>{label}</span>
    </div>
  );
}
