'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, ArrowLeft, CalendarClock, Check, CreditCard, Loader2, Video,
} from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { startPaidCheckout } from '../lib/checkout';
import { mentorDisplayTz, tzShort } from '../lib/timezone';
import { hoursText } from '../lib/utils';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ReviewForm } from './Reviews';

// ── Types ────────────────────────────────────────────────────────────────────
interface Offer {
  id: string; proposed_by: string; status: string;
  range_start: string | null; range_end: string | null;
  requested_date?: string | null; selected_time?: string | null;
}
interface Req {
  id: string; kind: string; initiated_by: string; status: string; respond_by: string | null;
}
interface PaymentInfo { state: string; amount: number | null; currency: string | null; }
interface Detail {
  id: string;
  role: 'candidate' | 'mentor' | 'admin';
  status: string;
  service_title: string;
  service_duration: number | null;
  service_type: string | null;
  slot_time: string | null;
  slot_end: string | null;
  is_past: boolean;
  paid: boolean;
  unpaid_hold: boolean;
  reschedule_count: number;
  no_show_by: string | null;
  deadline_state: 'free' | 'late' | 'buffer' | null;
  cancel_notice_hours?: number | null;   // this mentor's cancellation/reschedule notice (BUG-119)
  buffer_hours?: number | null;          // hard cut-off before the session
  opens_at: string | null;
  closes_at: string | null;
  join_open: boolean;
  offer: Offer | null;
  request: Req | null;
  candidate_tz: string | null;
  mentor_name: string | null;
  mentor_photo: string | null;
  mentor_slug: string | null;
  mentor_tz: string | null;
  mentor_country: string | null;
  candidate_name?: string | null;
  candidate_email?: string | null;
  candidate_phone?: string | null;
  notes?: string | null;
  answers?: { question: string; answer: string }[];
  payment?: PaymentInfo;
  pay_context?: { mentor_id: string; service_id: string; mentor_slug: string | null; phone: string };
  can_pay: boolean;
  can_join: boolean;
  can_reschedule: boolean;
  can_cancel: boolean;
  can_report_no_show: boolean;
}

const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

function fmtInTz(iso: string | null, tz: string): string {
  if (!iso) return 'Time to be set';
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: tz, weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}
function dateLong(iso: string | null): string {
  if (!iso) return 'Time to be set';
  return new Date(iso).toLocaleDateString(undefined, {
    timeZone: BROWSER_TZ, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}
function timeShort(iso: string | null, tz: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtMoney(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null || !currency) return '';
  // customer_payments.amount is stored in MAJOR units (decimal, actually charged) - not minor.
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

type BadgeTone = 'brand' | 'accent' | 'neutral' | 'success' | 'warning';
const STATUS_TONE: Record<string, BadgeTone> = {
  confirmed: 'brand', rescheduled: 'accent', completed: 'success',
  cancelled: 'neutral', no_show: 'warning', pending: 'warning',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Payment pending', confirmed: 'Confirmed', rescheduled: 'Rescheduled',
  completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show',
};

// ── Component ────────────────────────────────────────────────────────────────
export function SessionDetail({ bookingId }: { bookingId: string }) {
  const router = useRouter();   // BUG-121: no-show actions navigate, not just message
  const [d, setD] = useState<Detail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [slotTaken, setSlotTaken] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');   // BUG-123: mandatory before cancelling
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  const authedFetch = useCallback(async (url: string, init?: RequestInit) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await authedFetch(`/api/booking/${bookingId}/detail`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setLoadError(data.detail || 'Could not load this session.'); return; }
      setD(data);
    } catch { setLoadError('Could not load this session.'); }
  }, [authedFetch, bookingId]);

  useEffect(() => { load(); }, [load]);

  async function act(url: string, body: Record<string, unknown>, successMsg?: string) {
    setBusy(true); setActionError(null); setActionSuccess(null);
    try {
      const res = await authedFetch(url, { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setActionError(data.detail || 'Action failed. Please try again.'); return; }
      if (successMsg) setActionSuccess(successMsg);
      await load();
    } catch { setActionError('Action failed. Please try again.'); }
    finally { setBusy(false); }
  }

  async function completePayment() {
    if (!d?.pay_context || !d.slot_time) return;
    setBusy(true); setActionError(null); setSlotTaken(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email ?? '';
    const phone = d.pay_context.phone || '';
    if (phone.replace(/\D/g, '').length < 7) {
      setActionError('We could not find a phone number for this booking. Please rebook from the mentor page.');
      setBusy(false); return;
    }
    await startPaidCheckout(
      {
        mentorId: d.pay_context.mentor_id,
        serviceId: d.pay_context.service_id,
        slotTime: d.slot_time,
        email, phone,
        serviceTitle: d.service_title,
      },
      {
        onConfirmed: async () => { await load(); setBusy(false); },
        onSlotTaken: (msg) => { setSlotTaken(msg); setBusy(false); },
        onError: (msg) => { setActionError(msg); setBusy(false); },
        onDismiss: () => { setBusy(false); },
      },
    );
  }

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-16 text-center">
        <p className="text-sm text-red-600">{loadError}</p>
        <BackLink />
      </div>
    );
  }
  if (!d) {
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-16 flex items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading session…
      </div>
    );
  }

  const isCandidate = d.role === 'candidate';
  const isMentor = d.role === 'mentor';
  const isAdmin = d.role === 'admin';
  const mentorTz = mentorDisplayTz(d.mentor_tz ?? undefined, d.mentor_country ?? undefined) || d.mentor_tz || 'UTC';
  const candTz = d.candidate_tz || 'UTC';
  const initials = (d.mentor_name ?? 'M').split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase();

  // Time rows adapt to who's looking.
  const timeRows: [string, string][] = [];
  if (d.slot_time) {
    if (isCandidate) {
      timeRows.push(['Your time', `${timeShort(d.slot_time, BROWSER_TZ)} · ${tzShort(BROWSER_TZ)}`]);
      if (tzShort(mentorTz) !== tzShort(BROWSER_TZ)) timeRows.push(["Mentor's time", `${timeShort(d.slot_time, mentorTz)} · ${tzShort(mentorTz)}`]);
    } else if (isMentor) {
      timeRows.push(['Your time', `${timeShort(d.slot_time, mentorTz)} · ${tzShort(mentorTz)}`]);
      if (tzShort(candTz) !== tzShort(mentorTz)) timeRows.push(["Attendee's time", `${timeShort(d.slot_time, candTz)} · ${tzShort(candTz)}`]);
    } else {
      timeRows.push(["Attendee's time", `${timeShort(d.slot_time, candTz)} · ${tzShort(candTz)}`]);
      timeRows.push(["Mentor's time", `${timeShort(d.slot_time, mentorTz)} · ${tzShort(mentorTz)}`]);
    }
  }

  const detailRows: [string, string][] = [
    ['Session', d.service_title],
    ['Date', dateLong(d.slot_time)],
    ...timeRows,
    ['Duration', `${d.service_duration ?? '-'} min · ${d.service_type === 'dm' ? 'Direct message' : 'Video call'}`],
    ['Booking', `#${d.id.slice(0, 8)}`],
  ];
  if (d.payment && (isAdmin || isMentor || isCandidate)) {
    const amt = fmtMoney(d.payment.amount, d.payment.currency);
    const paidState = d.payment.state === 'captured' || d.payment.state === 'processed';
    detailRows.push(['Payment', amt ? `${amt} · ${paidState ? 'Paid' : d.unpaid_hold ? 'Pending' : d.payment.state}` : (paidState ? 'Paid' : 'Pending')]);
  }

  const mentorProposal = d.offer && d.offer.proposed_by === 'mentor' && d.offer.status === 'pending';
  const pendingReq = d.request && d.request.status === 'pending';
  const toIso = (local: string) => new Date(local).toISOString();

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-8 sm:py-10">
      <BackLink />

      {/* Everything sits in one card, matching the booking-confirmation layout. */}
      <div className="mt-4 rounded-2xl border border-[--color-border] bg-white p-6 sm:p-8">

      {/* Header: title on the left, status pinned top-right beside it. */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="min-w-0 flex-1 text-lg font-semibold tracking-tight text-brand-900 break-words">{d.service_title}</h1>
        <Badge tone={STATUS_TONE[d.status] ?? 'neutral'} className="shrink-0 text-sm px-3.5 py-1">
          {STATUS_LABEL[d.status] ?? d.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Payment-pending banner */}
      {d.unpaid_hold && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              {d.is_past ? 'This hold expired' : 'Payment pending'}
            </p>
            <p className="text-sm text-amber-800 mt-0.5">
              {d.is_past
                ? 'This time has passed. Pick a new slot to book with this mentor.'
                : "This slot is held for you until you pay. It isn't confirmed until payment is complete."}
            </p>
          </div>
        </div>
      )}

      {/* Party card: mentor (for candidate/admin) and/or attendee (for mentor/admin) */}
      <div className="mt-6 flex flex-col gap-4">
        {(isCandidate || isAdmin) && (
          <div className="flex items-center gap-3">
            {d.mentor_photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.mentor_photo} alt={d.mentor_name ?? ''} className="h-12 w-12 rounded-full object-cover shrink-0" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-700 to-accent-500 flex items-center justify-center text-white font-semibold shrink-0">{initials}</div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Mentor</p>
              <p className="font-semibold text-brand-900 break-words">{d.mentor_name ?? 'Your mentor'}</p>
            </div>
            {d.mentor_slug && (
              <Link href={`/mentors/${d.mentor_slug}`} className="ml-auto text-xs font-medium text-brand-700 hover:underline shrink-0">
                View profile
              </Link>
            )}
          </div>
        )}
        {(isMentor || isAdmin) && d.candidate_name && (
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold shrink-0">
              {(d.candidate_name[0] ?? 'A').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Attendee</p>
              <p className="font-semibold text-brand-900 break-words">{d.candidate_name}</p>
              {d.candidate_email && <p className="text-xs text-muted break-words">{d.candidate_email}</p>}
              {d.candidate_phone && <p className="text-xs text-muted break-words">{d.candidate_phone}</p>}
            </div>
          </div>
        )}
      </div>

      {/* BUG-113: the customer's prep note + intake answers - mentor sees "what to prepare",
          the customer sees a copy of what they submitted. */}
      {(d.notes || (d.answers?.length ?? 0) > 0) && (
        <div className="mt-6 rounded-2xl border border-[--color-border] bg-brand-50/40 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
            {isCandidate ? 'What you shared with your mentor' : 'What to prepare'}
          </p>
          {d.notes && <p className="mt-2 text-sm text-foreground whitespace-pre-line break-words">{d.notes}</p>}
          {(d.answers ?? []).map((a, i) => (
            <div key={i} className="mt-3">
              <p className="text-xs font-semibold text-brand-900 break-words">{a.question}</p>
              <p className="text-sm text-foreground whitespace-pre-line break-words">{a.answer}</p>
            </div>
          ))}
        </div>
      )}

      {/* Details: airy label/value pairs, no boxes */}
      <dl className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        {detailRows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">{k}</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground break-words">{v}</dd>
          </div>
        ))}
      </dl>

      {/* Mentee: rate + review a completed session */}
      {isCandidate && d.status === 'completed' && (
        <div className="mt-7 rounded-2xl border border-[--color-border] p-5">
          <h2 className="text-base font-semibold text-foreground">Rate your session</h2>
          <p className="text-sm text-muted mt-0.5 mb-3">Your review helps other mentees. You can update it anytime.</p>
          <ReviewForm bookingId={bookingId} />
        </div>
      )}

      {actionError && (
        <p className="mt-6 text-sm text-red-600 flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {actionError}
        </p>
      )}

      {/* Confirmation after an action (e.g. reporting a no-show or choosing a resolution) - BUG-082. */}
      {actionSuccess && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-2.5">
          <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-emerald-900">{actionSuccess}</p>
        </div>
      )}

      {/* Slot-taken message after a failed re-pay */}
      {slotTaken && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-900">{slotTaken}</p>
          {d.mentor_slug && (
            <Link href={`/mentors/${d.mentor_slug}`} className="mt-3 inline-block">
              <Button variant="primary">Pick another time</Button>
            </Link>
          )}
        </div>
      )}

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <div className="mt-8 flex flex-col gap-3">
        {/* Candidate: complete payment */}
        {d.can_pay && !slotTaken && (
          <Button variant="accent" loading={busy} onClick={completePayment}>
            <CreditCard className="h-4 w-4" /> Complete payment
          </Button>
        )}

        {/* Join (candidate + mentor). BUG-090: this is ALWAYS a real link to the meeting (same as the
            email) so it can be joined from the dashboard - the /meeting page shows a countdown if it
            isn't open yet. BUG-105: stay visible until the session ENDS (+grace), not just until it
            starts, so a late joiner can still get in mid-session. */}
        {(isCandidate || isMentor) && d.paid && (!d.closes_at || new Date(d.closes_at).getTime() > Date.now()) && (
          <div className="flex flex-col gap-1.5">
            <Link href={`/meeting/${d.id}`}>
              <Button variant="primary" className="w-full"><Video className="h-4 w-4" /> Join meeting</Button>
            </Link>
            {!d.join_open && d.opens_at && (
              <p className="text-xs text-muted text-center">
                Opens 5 minutes before the session · {timeShort(d.opens_at, BROWSER_TZ)} {tzShort(BROWSER_TZ)}
              </p>
            )}
          </div>
        )}

        {/* Mentee: mentor proposed a new time -> go to the reschedule page to pick a slot (the mentor's
            proposed frame by default, or all their free times). No reject; cancelling is separate. */}
        {isCandidate && mentorProposal && d.offer && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 flex flex-col gap-3">
            <p className="text-sm text-violet-900">
              Your mentor proposed a new time{d.offer.range_start && d.offer.range_end ? <> between <strong>{fmtInTz(d.offer.range_start, BROWSER_TZ)}</strong> and <strong>{fmtInTz(d.offer.range_end, BROWSER_TZ)}</strong></> : null}. Pick a slot that works, no extra payment, your session is already paid.
            </p>
            <Link href={`/session/${d.id}/reschedule`}>
              <Button variant="primary" className="w-full sm:w-auto"><CalendarClock className="h-4 w-4" /> Pick your new time</Button>
            </Link>
            <button type="button" onClick={() => setShowCancelConfirm(true)} className="text-xs font-medium text-red-600 hover:underline self-start">
              Or cancel this session instead
            </button>
          </div>
        )}

        {/* Mentor: you proposed a new time; waiting for the attendee to choose. */}
        {isMentor && mentorProposal && d.offer && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-sm text-violet-900">You proposed a new time. Waiting for the attendee to pick a slot; we&apos;ll email you once they do.</p>
          </div>
        )}

        {/* Mentor: a pending cancel/reschedule request to answer */}
        {isMentor && pendingReq && d.request && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-2">
            <p className="text-sm text-amber-900">
              The attendee requested a <strong>{d.request.kind}</strong>. Respond before {fmtInTz(d.request.respond_by, BROWSER_TZ)} or it auto-approves.
            </p>
            <div className="flex gap-2">
              <Button variant="primary" loading={busy}
                onClick={() => act('/api/booking/request/respond', { request_id: d.request!.id, accept: true })}>Approve</Button>
              <Button variant="outline" loading={busy}
                onClick={() => act('/api/booking/request/respond', { request_id: d.request!.id, accept: false })}>Decline</Button>
            </div>
          </div>
        )}

        {/* No-show resolution */}
        {d.status === 'no_show' && isCandidate && d.no_show_by === 'mentor' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex flex-col gap-2">
            <p className="text-sm text-red-900">Your mentor didn&apos;t show up. How would you like to resolve it?</p>
            {/* BUG-121: each button now DOES the thing it says instead of only sending a message.
                Rebook opens the booking page it refers to; the refund request is submitted for review
                rather than confirmed as paid, because a human decides it. */}
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" loading={busy}
                onClick={async () => {
                  await act('/api/booking/no-show/resolve-mentor', { booking_id: d.id, choice: 'rebook_same' });
                  // Straight to this mentor's booking page: the credit is already on the booking, so
                  // picking a new time is the only step left.
                  if (d.mentor_slug) router.push(`/mentors/${d.mentor_slug}`);
                }}>
                Rebook same mentor
              </Button>
              <Button variant="outline" loading={busy}
                onClick={async () => {
                  await act('/api/booking/no-show/resolve-mentor', { booking_id: d.id, choice: 'rebook_different' });
                  router.push('/mentors');
                }}>
                Try a different mentor
              </Button>
              <Button variant="outline" loading={busy}
                onClick={() => act('/api/booking/no-show/resolve-mentor', { booking_id: d.id, choice: 'refund' },
                  'Refund request submitted. The Immigroov team will review your case and contact you, usually within 5-7 business days.')}>
                Request refund
              </Button>
            </div>
            <p className="text-xs text-red-900/70">
              Booking a different mentor at another price? Email{' '}
              <a href="mailto:support@immigroov.com" className="underline">support@immigroov.com</a> and we&apos;ll sort the difference.
            </p>
          </div>
        )}
        {d.status === 'no_show' && isMentor && d.no_show_by === 'user' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex flex-col gap-2">
            <p className="text-sm text-red-900">The attendee was marked as a no-show.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" loading={busy} onClick={() => act('/api/booking/no-show/resolve-customer', { booking_id: d.id, choice: 'accept_rebook' }, 'Rebook offered. The session is reinstated for the attendee.')}>Offer a rebook</Button>
              <Button variant="outline" loading={busy} onClick={() => act('/api/booking/no-show/resolve-customer', { booking_id: d.id, choice: 'reject' }, 'Session closed. It is marked complete and your payout stands.')}>Close session</Button>
            </div>
          </div>
        )}

        {/* Reschedule + cancel (active, not past). BUG-081: cancel used to be hidden here too
            whenever a proposal/request was already in flight, which meant a mentor lost their own
            cancel button the moment THEY sent a proposal. Only "start a new negotiation" (propose/
            reschedule) needs to wait for the current one to resolve - cancel always stays available. */}
        {(isCandidate || isMentor) && d.paid && !d.is_past && (
          <div className="flex flex-col gap-3 border-t border-[--color-border] pt-4">
            {d.deadline_state === 'buffer' && (
              // BUG-084: cancelling this close to the session no longer qualifies for a refund, so the
              // cancel button is hidden (can_cancel excludes buffer) - but a reschedule can still be
              // requested and just needs the other side's approval, so that stays available below.
              <p className="text-xs text-muted">
                Within {hoursText(d.buffer_hours ?? 2)} of the session, cancelling here isn&apos;t available and
                wouldn&apos;t qualify for a refund. You can still request a reschedule below.
              </p>
            )}
            {!mentorProposal && !pendingReq && d.can_reschedule && (
              isMentor ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-foreground">Propose a new time range</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <input type="datetime-local" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)}
                      className="h-10 px-3 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none" />
                    <input type="datetime-local" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)}
                      className="h-10 px-3 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none" />
                  </div>
                  <Button variant="outline" loading={busy} disabled={!rangeStart || !rangeEnd}
                    onClick={() => act('/api/booking/reschedule/propose', {
                      booking_id: d.id, offer_date: rangeStart.slice(0, 10),
                      range_start: toIso(rangeStart), range_end: toIso(rangeEnd),
                    })}>Send proposal</Button>
                </div>
              ) : (
                <Link href={`/session/${d.id}/reschedule`}><Button variant="outline" className="w-full sm:w-auto">Reschedule</Button></Link>
              )
            )}
            {d.can_report_no_show && (
              <Button variant="outline" loading={busy}
                onClick={() => act('/api/booking/no-show/flag', { booking_id: d.id, no_show_party: isCandidate ? 'mentor' : 'user' }, 'No-show reported. We have emailed a confirmation to both of you. Choose how to resolve it below.')}>
                Report a no-show
              </Button>
            )}
            {/* BUG-127: same treatment as Reschedule - cancelling is a normal choice, not a scary one. */}
            {d.can_cancel && (
              <Button variant="outline" loading={busy} className="w-full sm:w-auto self-start"
                onClick={() => setShowCancelConfirm(true)}>
                {d.deadline_state === 'free' || isMentor ? 'Cancel session' : 'Request cancellation'}
              </Button>
            )}
          </div>
        )}

        {/* Report no-show even when reschedule/cancel are hidden (past start) */}
        {(isCandidate || isMentor) && d.paid && d.can_report_no_show && d.is_past && (
          <Button variant="outline" loading={busy}
            onClick={() => act('/api/booking/no-show/flag', { booking_id: d.id, no_show_party: isCandidate ? 'mentor' : 'user' })}>
            Report a no-show
          </Button>
        )}
      </div>

      </div>{/* end card */}

      {/* Cancel confirmation with the refund notice (never a silent one-click cancel) */}
      {showCancelConfirm && (() => {
        const late = d.deadline_state !== 'free';
        const window = hoursText(d.cancel_notice_hours ?? 24);
        const title = !isMentor && late ? 'Request cancellation?' : 'Cancel this session?';
        // BUG-122: never promise a refund "in full" - the payment gateway fee is not refundable, so we
        // state that the refund follows the policy and link to it. BUG-119: quote this mentor's own
        // notice window rather than a hardcoded 24 hours.
        const notice = isMentor
          ? (late
              ? `Late cancellation (within ${window} of the session): the attendee is refunded as per our refund policy, and a 25% penalty applies to your payout.`
              : 'The attendee will be refunded as per our refund policy. No penalty applies to you.')
          : (late
              ? `This is within ${window} of the session, so it needs your mentor's approval. If they decline, a 50% late-cancellation fee is kept and the remainder is refunded as per our refund policy.`
              : `You're cancelling more than ${window} ahead, so a refund will be issued as per our refund policy.`);
        const confirmLabel = isMentor ? 'Yes, cancel' : late ? 'Send request' : 'Cancel session';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowCancelConfirm(false)}>
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-brand-900">{title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                {notice}{' '}
                <Link href="/terms" target="_blank" className="underline hover:text-foreground">Refund policy</Link>
              </p>
              {/* BUG-123: a reason is required from whoever cancels. It's sent to the other party and
                  kept for any refund review, so the confirm button stays disabled until it's given. */}
              <div className="mt-4 text-left">
                <label className="text-sm font-medium text-foreground" htmlFor="cancel-reason">
                  Reason for cancelling <span className="text-red-600">*</span>
                </label>
                <textarea id="cancel-reason" rows={3} value={cancelReason} maxLength={1000}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={isMentor ? 'Let the attendee know why you need to cancel.' : 'Let your mentor know why you need to cancel.'}
                  className="mt-1.5 w-full px-3 py-2 rounded-xl bg-white text-sm resize-y placeholder:text-muted shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]" />
                <p className="text-xs text-muted mt-1">Shared with {isMentor ? 'the attendee' : 'your mentor'}.</p>
              </div>
              <div className="mt-5 flex flex-col gap-2.5">
                <Button variant="ghost" className="text-red-600 hover:bg-red-50" loading={busy}
                  disabled={cancelReason.trim().length < 3}
                  onClick={async () => {
                    setShowCancelConfirm(false);
                    await act('/api/booking/cancel', {
                      booking_id: d.id, cancelled_by: isMentor ? 'mentor' : 'user', reason: cancelReason.trim(),
                    });
                    setCancelReason('');
                  }}>
                  {confirmLabel}
                </Button>
                <Button variant="primary" onClick={() => setShowCancelConfirm(false)}>Keep session</Button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

function BackLink() {
  const router = useRouter();
  // "Return to previous page": go back to wherever they came from (admin Bookings, mentor hub, or
  // the account sessions list) instead of always dumping everyone on the mentee account page.
  return (
    <button type="button" onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Back
    </button>
  );
}
