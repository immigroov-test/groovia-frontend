'use client';
import { useState } from 'react';
import { Card, CardBody } from './ui/Card';
import { cn } from '../lib/utils';

export interface LegacySession {
  status: string | null;
  service_title: string | null;
  service_type: string | null;
  customer_name: string | null;
  slot_start: string | null;
  duration_min: number | null;
  amount_total: number | null;
  amount_currency: string | null;
}

function money(total?: number | null, currency?: string | null): string {
  if (!total || !currency) return '';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(total); }
  catch { return `${total} ${currency}`; }
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const STATUS_TONE: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-neutral-100 text-muted',
  no_show: 'bg-amber-50 text-amber-700',
  refunded: 'bg-neutral-100 text-muted',
};

// Read-only session history imported from the old portal (see legacy_sessions). Shared by the public
// mentor profile and the mentor dashboard. Presentational only, the caller fetches the data.
export function PastSessions({ sessions, heading = 'Past sessions' }: { sessions: LegacySession[]; heading?: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!sessions || sessions.length === 0) return null;
  const shown = expanded ? sessions : sessions.slice(0, 5);

  return (
    <Card>
      <CardBody className="pt-6">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 className="text-base font-semibold text-foreground">{heading}</h2>
          <span className="text-sm text-muted">{sessions.length} total</span>
        </div>
        <div className="flex flex-col divide-y divide-[--color-border]">
          {shown.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.service_title || 'Session'}</p>
                <p className="text-xs text-muted truncate">
                  {[s.customer_name, s.duration_min ? `${s.duration_min} min` : '', fmtDate(s.slot_start)].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {money(s.amount_total, s.amount_currency) && (
                  <span className="text-sm text-muted">{money(s.amount_total, s.amount_currency)}</span>
                )}
                {s.status && (
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', STATUS_TONE[s.status] ?? 'bg-neutral-100 text-muted')}>
                    {s.status.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {sessions.length > 5 && (
          <button type="button" onClick={() => setExpanded((v) => !v)}
            className="mt-3 text-sm font-medium text-brand-700 hover:text-brand-900">
            {expanded ? 'Show less' : `Show all ${sessions.length}`}
          </button>
        )}
      </CardBody>
    </Card>
  );
}
