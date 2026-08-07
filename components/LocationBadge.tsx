'use client';
import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import {
  detectLocation, countryName, setUserCountry, clearUserCountry, hasUserCountry, type GeoLocation,
} from '../lib/geo';
import { CountrySelect } from './ui/CountrySelect';
import { cn } from '../lib/utils';

// "You are here" indicator. `inline` = a compact chip for the desktop nav; `menu` (default) =
// a full row at the bottom of the mobile menu. Uses the same edge geo as pricing. A "Change"
// control lets the visitor set their country manually as a backup when auto-detection is wrong
// or blocked; the choice is saved and applied on reload (display only, the charge still follows
// the real edge IP).
export function LocationBadge({ variant = 'menu' }: { variant?: 'inline' | 'menu' }) {
  const [loc, setLoc] = useState<GeoLocation | null>(null);
  const [editing, setEditing] = useState(false);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    let active = true;
    setManual(hasUserCountry());
    detectLocation().then((g) => { if (active && /^[A-Z]{2}$/.test(g.code)) setLoc(g); });
    return () => { active = false; };
  }, []);

  if (!loc) return null;
  const label = loc.city ? `${loc.city}, ${countryName(loc.code)}` : countryName(loc.code);

  function choose(code: string) {
    if (!/^[A-Za-z]{2}$/.test(code)) return;
    setUserCountry(code);
    window.location.reload();   // re-run detection app-wide with the override applied
  }
  function reset() {
    clearUserCountry();
    window.location.reload();
  }

  const picker = editing ? (
    <div className={cn(
      'absolute z-50 w-64 rounded-xl border border-[--color-border] bg-white p-3 shadow-xl',
      variant === 'inline' ? 'right-0 top-full mt-2' : 'left-0 bottom-full mb-2',
    )}>
      <p className="text-xs font-medium text-foreground mb-1.5">Set your country</p>
      <CountrySelect value={manual ? loc.code : ''} onChange={choose} placeholder="Search a country" />
      <div className="mt-2 flex items-center justify-between">
        {manual
          ? <button type="button" onClick={reset} className="text-xs font-medium text-brand-700 hover:underline">Use detected location</button>
          : <span className="text-[11px] text-muted">Detected from your connection</span>}
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-muted hover:text-foreground">Close</button>
      </div>
    </div>
  ) : null;

  if (variant === 'inline') {
    return (
      <span className="relative inline-flex min-w-0 max-w-[240px] items-center gap-1 text-xs font-medium text-muted">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-accent-500" aria-hidden />
        <span className="truncate" title={label}>{label}</span>
        <button type="button" onClick={() => setEditing((v) => !v)} className="shrink-0 text-brand-700 hover:underline">Change</button>
        {picker}
      </span>
    );
  }

  return (
    <div className="relative mt-1 flex items-center gap-2 border-t border-[--color-border] px-3 pt-3 pb-1 text-xs text-muted">
      <MapPin className="h-4 w-4 shrink-0 text-accent-500" aria-hidden />
      <span className="truncate" title={label}>{label}</span>
      <button type="button" onClick={() => setEditing((v) => !v)} className="ml-auto shrink-0 text-brand-700 hover:underline">Change</button>
      {picker}
    </div>
  );
}
