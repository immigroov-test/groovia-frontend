'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, ArrowLeft, Clock, CreditCard, Loader2, Lock, Video,
} from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { startPaidCheckout } from '../lib/checkout';
import { mentorDisplayTz, tzShort } from '../lib/timezone';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

// ── Types ────────────────────────────────────────────────────────────────────
interface Offer {
  id: string; proposed_by: string; status: string;
  range_start: string | null; range_end: string | null;
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
  opens_at: string | null;
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
  return new Date(iso).toLocaleString(undefined, {
    timeZone: tz, weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
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
  return new Date(iso).toLocaleTimeString(undefined, { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true });
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
  const [d, setD] = useState<Detail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [slotTaken, setSlotTaken] = useState<string | null>(null);
  const [showJoinInfo, setShowJoinInfo] = useState(false);
  const [newTime, setNewTime] = useState('');
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

  async function act(url: string, body: Record<string, unknown>) {
    setBusy(true); setActionError(null);
    try {
      const res = await authedFetch(url, { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setActionError(data.detail || 'Action failed. Please try again.'); return; }
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

      {/* Details: airy label/value pairs, no boxes */}
      <dl className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        {detailRows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">{k}</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground break-words">{v}</dd>
          </div>
        ))}
      </dl>

      {actionError && (
        <p className="mt-6 text-sm text-red-600 flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {actionError}
        </p>
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

        {/* Join (candidate + mentor) on active sessions */}
        {(isCandidate || isMentor) && d.paid && !d.is_past && (
          d.join_open ? (
            <Link href={`/meeting/${d.id}`}>
              <Button variant="primary" className="w-full"><Video className="h-4 w-4" /> Join meeting</Button>
            </Link>
          ) : (
            <Button variant="primary" className="opacity-60" onClick={() => setShowJoinInfo(true)}>
              <Lock className="h-4 w-4" /> Join meeting
            </Button>
          )
        )}

        {/* Mentee: mentor proposed a new time */}
        {isCandidate && mentorProposal && d.offer && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 flex flex-col gap-2">
            <p className="text-sm text-violet-900">
              Your mentor proposed a new time between <strong>{fmtInTz(d.offer.range_start, BROWSER_TZ)}</strong> and <strong>{fmtInTz(d.offer.range_end, BROWSER_TZ)}</strong>. Pick a slot inside that range:
            </p>
            <input type="datetime-local" value={newTime} onChange={(e) => setNewTime(e.target.value)}
              className="h-10 px-3 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none" />
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" loading={busy} disabled={!newTime}
                onClick={() => act('/api/booking/reschedule/accept', { offer_id: d.offer!.id, slot_time: toIso(newTime) })}>
                Accept this time
              </Button>
              <Button variant="outline" loading={busy}
                onClick={() => act('/api/booking/reschedule/reject', { offer_id: d.offer!.id })}>
                Reject
              </Button>
            </div>
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
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" loading={busy} onClick={() => act('/api/booking/no-show/resolve-mentor', { booking_id: d.id, choice: 'rebook_same' })}>Rebook same mentor</Button>
              <Button variant="outline" loading={busy} onClick={() => act('/api/booking/no-show/resolve-mentor', { booking_id: d.id, choice: 'rebook_different' })}>Try a different mentor</Button>
              <Button variant="outline" loading={busy} onClick={() => act('/api/booking/no-show/resolve-mentor', { booking_id: d.id, choice: 'refund' })}>Request refund</Button>
            </div>
          </div>
        )}
        {d.status === 'no_show' && isMentor && d.no_show_by === 'user' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex flex-col gap-2">
            <p className="text-sm text-red-900">The attendee was marked as a no-show.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" loading={busy} onClick={() => act('/api/booking/no-show/resolve-customer', { booking_id: d.id, choice: 'accept_rebook' })}>Offer a rebook</Button>
              <Button variant="outline" loading={busy} onClick={() => act('/api/booking/no-show/resolve-customer', { booking_id: d.id, choice: 'reject' })}>Close session</Button>
            </div>
          </div>
        )}

        {/* Reschedule + cancel (active, not in buffer, not a live proposal/request) */}
        {(isCandidate || isMentor) && d.paid && !d.is_past && !mentorProposal && !pendingReq && (
          <div className="flex flex-col gap-3 border-t border-[--color-border] pt-4">
            {d.deadline_state === 'buffer' && (
              <p className="text-xs text-muted">Within 2 hours of the session, changes are locked. Contact the other party directly.</p>
            )}
            {d.can_reschedule && (
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
                <Link href={`/account/sessions/${d.id}/reschedule`}><Button variant="outline" className="w-full sm:w-auto">Reschedule</Button></Link>
              )
            )}
            {d.can_report_no_show && (
              <Button variant="outline" loading={busy}
                onClick={() => act('/api/booking/no-show/flag', { booking_id: d.id, no_show_party: isCandidate ? 'mentor' : 'user' })}>
                Report a no-show
              </Button>
            )}
            {d.can_cancel && (
              <Button variant="ghost" loading={busy} className="text-red-600 hover:bg-red-50 self-start"
                onClick={() => act('/api/booking/cancel', { booking_id: d.id, cancelled_by: isMentor ? 'mentor' : 'user' })}>
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

      {/* Join-window popup */}
      {showJoinInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowJoinInfo(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center">
              <Clock className="h-6 w-6 text-brand-700" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-brand-900">The room isn&apos;t open yet</h3>
            <p className="mt-1 text-sm text-muted">
              The meeting room opens 5 minutes before your session
              {d.opens_at && <> · at <span className="font-medium text-foreground">{timeShort(d.opens_at, BROWSER_TZ)} {tzShort(BROWSER_TZ)}</span></>}.
              Come back then to join.
            </p>
            <Button variant="primary" className="mt-5 w-full" onClick={() => setShowJoinInfo(false)}>Got it</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/account/sessions" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> All sessions
    </Link>
  );
}
