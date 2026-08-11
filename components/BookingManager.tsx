'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, CreditCard, Loader2, Star, Video } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';
import { mentorDisplayTz, tzOffset } from '../lib/timezone';

// One row from my_bookings / mentor_sessions. The list only needs the summary fields;
// the full lifecycle + actions live on the session detail page (/session/[id]).
export interface ManagedBooking {
  id: string;
  status: string;
  slot_time: string | null;
  slot_end: string | null;
  mentor_tz?: string | null;
  mentor_country?: string | null;
  service_title: string | null;
  service_duration: number | null;
  other_name: string | null;
  reschedule_count: number;
  // Money (major units). Candidate view (my_bookings): their charge; mentor view: their payout.
  pay_amount?: number | null;
  pay_currency?: string | null;
  pay_state?: string | null;
  payout_amount?: number | null;
  payout_currency?: string | null;
  payout_state?: string | null;
  // BUG-139: whether the mentee has already left a review for this (completed) session. Lets the
  // dashboard show "Leave a review" vs "Edit your review" without an extra per-row API call.
  reviewed?: boolean | null;
}

// A session stays joinable until 30 min past its end (matches the backend join window), so an
// in-progress call still counts as "upcoming" and keeps its Join action instead of dropping to
// "past" the moment it starts (BUG-105).
function joinableUntilMs(b: ManagedBooking): number {
  if (!b.slot_time) return Infinity;
  const start = new Date(b.slot_time).getTime();
  const end = b.slot_end ? new Date(b.slot_end).getTime() : start + (b.service_duration ?? 30) * 60_000;
  return end + 30 * 60_000;
}

function money(amount?: number | null, currency?: string | null): string {
  if (amount == null || !currency) return '';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount); }
  catch { return `${amount.toFixed(2)} ${currency}`; }
}

// A short money line for the card. Candidate sees their charge + status. BUG-097: the mentor's earning
// is NOT shown here - a payout varies with their commission and any referral, so a per-session figure
// on the session card is misleading. Earnings live on the Payments tab, which shows the real breakdown.
function payLine(b: ManagedBooking, role: Role): string | null {
  if (role === 'mentee') {
    if (!b.pay_state) return null;   // free / mock session
    const amt = money(b.pay_amount, b.pay_currency);
    if (b.pay_state === 'captured' || b.pay_state === 'processed') return amt ? `${amt} · Paid` : 'Paid';
    if (b.pay_state === 'refunded' || b.pay_state === 'partially_refunded') return amt ? `${amt} · Refunded` : 'Refunded';
    if (b.pay_state === 'failed') return 'Payment failed';
    return amt ? `${amt} · Payment pending` : 'Payment pending';
  }
  return null;
}

type Role = 'mentee' | 'mentor';

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

function shortTz(tz: string): string {
  return tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
}
function monthAbbr(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { timeZone: TZ, month: 'short' }).toUpperCase() : '· ·';
}
function dayNum(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { timeZone: TZ, day: 'numeric' }) : '?';
}
function timeOnly(iso: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }) : '';
}
function dateLong(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' }) : 'Time to be set';
}
function timeInTz(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
}

type BadgeTone = 'brand' | 'accent' | 'neutral' | 'success' | 'warning';
const STATUS_TONE: Record<string, BadgeTone> = {
  confirmed: 'brand', rescheduled: 'accent', completed: 'success',
  cancelled: 'neutral', no_show: 'warning', pending: 'warning',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Payment pending', confirmed: 'confirmed', rescheduled: 'rescheduled',
  completed: 'completed', cancelled: 'cancelled', no_show: 'no-show',
};

export function BookingManager({ role }: { role: Role }) {
  const [bookings, setBookings] = useState<ManagedBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endpoint = role === 'mentee' ? '/api/booking/my' : '/api/mentor/availability-v2/sessions';

  const load = useCallback(async () => {
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(endpoint, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Could not load your bookings.'); return; }
      // mentor sessions endpoint returns an array; /booking/my returns { bookings }.
      setBookings(Array.isArray(data) ? data : (data.bookings ?? []));
    } catch { setError('Could not load your bookings.'); }
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (bookings === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your bookings…
      </div>
    );
  }
  if (bookings.length === 0) {
    return <p className="text-sm text-muted">No bookings yet.</p>;
  }

  const isPendingPay = (b: ManagedBooking) => b.status === 'pending';
  const isUpcoming = (b: ManagedBooking) =>
    (b.status === 'confirmed' || b.status === 'rescheduled') &&
    joinableUntilMs(b) > Date.now();
  const isCancelled = (b: ManagedBooking) => b.status === 'cancelled';

  // BUG-138: nothing was sorted, so the order was whatever the API happened to return. What you need
  // next belongs at the top, so anything still ahead of you reads soonest-first; anything behind you
  // reads most-recent-first, which is how you'd look back through it.
  const startMs = (b: ManagedBooking) => (b.slot_time ? new Date(b.slot_time).getTime() : 0);
  const soonestFirst = (a: ManagedBooking, b: ManagedBooking) => startMs(a) - startMs(b);
  const latestFirst = (a: ManagedBooking, b: ManagedBooking) => startMs(b) - startMs(a);

  const pending = bookings.filter(isPendingPay).sort(soonestFirst);
  const upcoming = bookings.filter(isUpcoming).sort(soonestFirst);
  const cancelled = bookings.filter(isCancelled).sort(latestFirst);
  const past = bookings
    .filter((b) => !isPendingPay(b) && !isUpcoming(b) && !isCancelled(b))
    .sort(latestFirst);

  const renderCard = (b: ManagedBooking) => <BookingCard key={b.id} b={b} role={role} />;

  const Section = ({ title, count, dim, children }: { title: React.ReactNode; count: number; dim?: boolean; children: React.ReactNode }) => (
    <section>
      <h3 className="text-sm font-semibold text-brand-900 mb-3">
        {title} <span className="text-muted font-normal">· {count}</span>
      </h3>
      <div className={cn('flex flex-col gap-4', dim && 'opacity-80')}>{children}</div>
    </section>
  );

  return (
    <div className="flex flex-col gap-8">
      {pending.length > 0 && (
        <Section title={<span className="text-amber-700">Payment pending</span>} count={pending.length}>
          {pending.map(renderCard)}
        </Section>
      )}
      {upcoming.length > 0 && <Section title="Upcoming" count={upcoming.length}>{upcoming.map(renderCard)}</Section>}
      {past.length > 0 && <Section title="Past &amp; completed" count={past.length} dim>{past.map(renderCard)}</Section>}
      {cancelled.length > 0 && <Section title="Cancelled" count={cancelled.length} dim>{cancelled.map(renderCard)}</Section>}
    </div>
  );
}

// A clean, clickable summary. Everything is vertically centered on one row: a fixed date
// chip, the session details in the middle, and a right-aligned status hint + chevron so
// the card reads as a single tappable unit that opens the full detail page.
function BookingCard({ b, role }: { b: ManagedBooking; role: Role }) {
  const pending = b.status === 'pending';
  const active = b.status === 'confirmed' || b.status === 'rescheduled';
  const future = joinableUntilMs(b) > Date.now();   // BUG-105: keep "Join" through the session's end
  // Resolve the mentor's display zone the way the booking/detail pages do: a bare 'UTC' (migrated
  // mentors who never set a real zone) falls back to their country's city instead of an opaque
  // "UTC". Show it only when it actually differs from the viewer's clock.
  const mentorTz = mentorDisplayTz(b.mentor_tz ?? undefined, b.mentor_country ?? undefined) || b.mentor_tz || 'UTC';
  const showMentorTz = role === 'mentee' && !!b.slot_time && !!b.mentor_tz && tzOffset(mentorTz) !== tzOffset(TZ);

  // BUG-139: a completed session the mentee hasn't reviewed yet gets a "Leave a review" nudge
  // instead of the generic "View details" hint - same link (/session/[id]), where the rating +
  // review form lives, just made visible from the list instead of only on the detail page.
  const canReview = role === 'mentee' && b.status === 'completed' && !b.reviewed;

  const hint = pending
    ? { label: 'Complete payment', icon: CreditCard, cls: 'text-amber-700' }
    : active && future
      ? { label: 'View · Join', icon: Video, cls: 'text-brand-700' }
      : canReview
        ? { label: 'Leave a review', icon: Star, cls: 'text-amber-600' }
        : { label: 'View details', icon: null, cls: 'text-muted' };
  const HintIcon = hint.icon;

  return (
    <Link
      href={`/session/${b.id}`}
      className="group block rounded-2xl border border-[--color-border] bg-white p-4 sm:p-5 transition-colors hover:border-brand-400 hover:bg-brand-50/30"
    >
      <div className="flex items-center gap-4">
        {/* Date chip */}
        <div className={cn(
          'shrink-0 w-14 h-14 rounded-xl border flex flex-col items-center justify-center',
          pending ? 'bg-amber-50 border-amber-200' : 'bg-brand-50 border-[--color-border]',
        )}>
          <span className={cn('text-[10px] font-semibold uppercase tracking-wide', pending ? 'text-amber-700' : 'text-brand-700')}>{monthAbbr(b.slot_time)}</span>
          <span className="text-xl font-bold text-brand-900 leading-none">{dayNum(b.slot_time)}</span>
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground truncate">{b.service_title ?? 'Session'}</h3>
            <Badge tone={STATUS_TONE[b.status] ?? 'neutral'}>{STATUS_LABEL[b.status] ?? b.status.replace('_', ' ')}</Badge>
          </div>
          <p className="text-xs text-muted mt-0.5 truncate">
            {role === 'mentee' ? 'with ' : ''}{b.other_name ?? (role === 'mentee' ? 'your mentor' : 'your attendee')}
          </p>
          {b.slot_time && (
            <p className="text-sm text-foreground mt-1.5 font-medium">
              {timeOnly(b.slot_time)} <span className="text-muted font-normal">· {dateLong(b.slot_time)}</span>
            </p>
          )}
          <p className="text-xs text-muted mt-0.5 truncate">
            Your time ({shortTz(TZ)})
            {showMentorTz && <> · mentor {timeInTz(b.slot_time!, mentorTz)} ({shortTz(mentorTz)})</>}
            {b.service_duration ? ` · ${b.service_duration} min` : ''}
          </p>
          {(() => {
            const pl = payLine(b, role);
            return pl ? <p className="text-xs font-medium text-brand-700 mt-1 truncate">{pl}</p> : null;
          })()}
        </div>

        {/* Right: state hint + chevron, vertically centered */}
        <div className="shrink-0 self-center flex items-center gap-1.5">
          <span className={cn('hidden sm:inline-flex items-center gap-1 text-xs font-semibold', hint.cls)}>
            {HintIcon && <HintIcon className="h-3.5 w-3.5" />}
            {hint.label}
          </span>
          <ChevronRight className="h-5 w-5 text-muted group-hover:text-brand-700 transition-colors" />
        </div>
      </div>
    </Link>
  );
}
