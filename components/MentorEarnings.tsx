'use client';
import { useEffect, useState } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Card, CardBody } from './ui/Card';
import type { ManagedBooking } from './BookingManager';

// BUG-097: a mentor's earning per session is not a fixed cut - it moves with their commission rate and
// with any referral on that booking - so it no longer sits on the session cards. It belongs here, next
// to the payout status, where the amount is stated as the actual payout for that specific session.
function money(amount?: number | null, currency?: string | null): string {
  if (amount == null || !currency) return '';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount); }
  catch { return `${amount.toFixed(2)} ${currency}`; }
}

const PAYOUT_LABEL: Record<string, string> = {
  paid: 'Paid out', pending: 'Pending', processing: 'Processing', on_hold: 'On hold', failed: 'Failed',
};

export function MentorEarnings() {
  const [rows, setRows] = useState<ManagedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await createClient().auth.getSession();
        const res = await fetch('/api/mentor/availability-v2/sessions', {
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
        });
        if (cancelled) return;
        if (!res.ok) { setError('Could not load your earnings.'); return; }
        const d = await res.json();
        setRows((d.bookings ?? d.sessions ?? []) as ManagedBooking[]);
      } catch { if (!cancelled) setError('Could not reach the server.'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const earning = rows.filter((b) => b.payout_amount != null);
  // Totals stay per-currency: mentors can hold sessions priced in more than one currency, and summing
  // across them would invent a number.
  const totals = earning.reduce<Record<string, number>>((acc, b) => {
    const c = b.payout_currency || '';
    if (c) acc[c] = (acc[c] ?? 0) + (b.payout_amount ?? 0);
    return acc;
  }, {});

  if (loading) {
    return (
      <Card><CardBody className="pt-6">
        <span className="inline-flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your earnings…
        </span>
      </CardBody></Card>
    );
  }

  return (
    <Card><CardBody className="pt-6">
      <h2 className="text-base font-semibold text-foreground">Session earnings</h2>
      <p className="flex items-start gap-1.5 text-xs text-muted mt-1">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-brand-500" aria-hidden="true" />
        <span>What you actually receive per session, after Immigroov&apos;s commission. It can differ
          between sessions if your commission changes or a referral applies to a booking.</span>
      </p>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      {!error && earning.length === 0 && (
        <p className="text-sm text-muted mt-4">No paid sessions yet. Your earnings will show up here.</p>
      )}

      {earning.length > 0 && (
        <>
          {Object.keys(totals).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
              {Object.entries(totals).map(([ccy, total]) => (
                <div key={ccy}>
                  <p className="text-xs text-muted">Total earned</p>
                  <p className="text-xl font-semibold text-brand-900">{money(total, ccy)}</p>
                </div>
              ))}
            </div>
          )}
          <ul className="mt-4 flex flex-col divide-y divide-[--color-border]">
            {earning.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{b.service_title ?? 'Session'}</p>
                  <p className="text-xs text-muted">
                    {b.slot_time ? new Date(b.slot_time).toLocaleDateString(undefined,
                      { day: 'numeric', month: 'short', year: 'numeric' }) : 'Time to be set'}
                    {b.other_name ? ` · ${b.other_name}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-brand-900">{money(b.payout_amount, b.payout_currency)}</p>
                  <p className="text-xs text-muted">{PAYOUT_LABEL[b.payout_state ?? ''] ?? 'Pending'}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </CardBody></Card>
  );
}
