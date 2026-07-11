'use client';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { Toggle } from './ui/Toggle';
import { createClient } from '../lib/supabase/client';

// Live per-mentor smart-pricing (PPP) toggle used in the mentor hub. Posts to the
// backend, which re-syncs is_ppp across the mentor's services.
export function SmartPricingToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setOn(next); setSaving(true); setErr(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/mentor/smart-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) { setOn(!next); setErr('Could not update. Please try again.'); }
    } catch { setOn(!next); setErr('Could not update. Please try again.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="rounded-xl border border-[--color-border] p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-foreground">Smart pricing</p>
          <span className="group relative inline-flex">
            <Info className="h-3.5 w-3.5 text-muted cursor-help" />
            <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 rounded-lg bg-brand-900 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg">
              Lets Immigroov adapt your price to each customer&apos;s country (purchasing-power parity) so it feels fair to them. This usually lifts your booking rate.
            </span>
          </span>
        </div>
        <p className="text-xs text-muted mt-0.5">When on, your session prices adjust to the customer&apos;s country to feel fair and win more bookings.</p>
        {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
      </div>
      <Toggle checked={on} onChange={toggle} disabled={saving} aria-label="Smart pricing" />
    </div>
  );
}
