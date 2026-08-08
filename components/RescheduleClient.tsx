'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarCheck, Loader2, ChevronLeft, AlertTriangle, Clock } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Button } from './ui/Button';
import {
  CalendarPanel, TZ, slotDateKey, formatSlotTime, formatDate, formatFullDateTime, shortTz,
} from './BookingCalendar';

interface Slot { slot_start: string; slot_end: string; }
interface Offer { id: string; range_start: string | null; range_end: string | null; }

// Reschedule for a session the customer already PAID for - it moves the existing booking, never
// re-charges. Two modes:
//   - Mentor proposed a time (offer present): default to the mentor's proposed frame, with a "See all
//     my available times" toggle to pick ANY free slot instead. Accept a slot -> done. No Reject here
//     (cancelling is a separate button on the session page, which follows the refund policy).
//   - Customer-initiated (no offer): pick a slot; the deadline rules apply (>=24h free, else request).
export function RescheduleClient({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [currentSlot, setCurrentSlot] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [done, setDone] = useState<string | null>(null);

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

  useEffect(() => {
    (async () => {
      setLoading(true); setLoadError(null);
      try {
        const res = await authedFetch(`/api/booking/${bookingId}/reschedule-slots`);
        const data = await res.json();
        if (!res.ok) { setLoadError(data.detail || 'Could not load times.'); return; }
        setSlots(data.slots ?? []);
        setCurrentSlot(data.current_slot ?? null);
        setDeadline(data.deadline_state ?? null);
        setOffer(data.offer ?? null);
      } catch { setLoadError('Could not load times.'); }
      finally { setLoading(false); }
    })();
  }, [authedFetch, bookingId]);

  const hasProposal = !!offer;

  // With a proposal and not "show all", restrict to slots inside the mentor's proposed time frame.
  const visibleSlots = useMemo(() => {
    if (hasProposal && !showAll && offer?.range_start && offer?.range_end) {
      const s = new Date(offer.range_start).getTime();
      const e = new Date(offer.range_end).getTime();
      return slots.filter((sl) => { const t = new Date(sl.slot_start).getTime(); return t >= s && t < e; });
    }
    return slots;
  }, [slots, hasProposal, showAll, offer]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of visibleSlots) {
      const k = slotDateKey(s.slot_start);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return map;
  }, [visibleSlots]);
  const availableDates = useMemo(() => new Set(slotsByDate.keys()), [slotsByDate]);
  const timeSlotsForDay = selectedDate ? (slotsByDate.get(selectedDate) ?? []) : [];

  // Default the selected date to the proposed day (so the frame's slots are shown immediately).
  useEffect(() => {
    if (hasProposal && !showAll && offer?.range_start) {
      setSelectedDate(slotDateKey(offer.range_start));
      setSelectedSlot(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasProposal, showAll, offer]);

  async function confirmReschedule() {
    if (!selectedSlot) return;
    setSubmitting(true); setError(null);
    try {
      const url = hasProposal ? '/api/booking/reschedule/accept' : '/api/booking/reschedule/customer';
      const body = hasProposal
        ? { offer_id: offer!.id, slot_time: selectedSlot.slot_start }
        : { booking_id: bookingId, slot_time: selectedSlot.slot_start };
      const res = await authedFetch(url, { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg: string = data.detail || 'Could not reschedule. Please try another time.';
        if (!hasProposal && /approval|24 ?h/i.test(msg)) { setNeedsApproval(true); setError(null); return; }
        setError(msg);
        return;
      }
      router.push(`/session/${bookingId}`);
      router.refresh();
    } catch { setError('Could not reschedule. Please try again.'); }
    finally { setSubmitting(false); }
  }

  async function sendRequest() {
    setSubmitting(true); setError(null);
    try {
      const res = await authedFetch('/api/booking/reschedule/request', {
        method: 'POST', body: JSON.stringify({ booking_id: bookingId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.detail || 'Could not send the request.'); return; }
      setDone('Your reschedule request was sent to your mentor. You’ll be notified once they respond.');
    } catch { setError('Could not send the request.'); }
    finally { setSubmitting(false); }
  }

  const back = (
    <Link href={`/session/${bookingId}`} className="text-sm text-muted hover:text-foreground inline-flex items-center gap-1 mb-6">
      <ChevronLeft className="h-4 w-4" /> Back to this session
    </Link>
  );

  if (loading) {
    return <><div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading available times…</div></>;
  }
  if (loadError) {
    return <>{back}<p className="text-sm text-red-600">{loadError}</p></>;
  }
  if (done) {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900 mb-2">Request sent</h1>
        <p className="text-sm text-muted mb-6">{done}</p>
        <Link href={`/session/${bookingId}`}><Button>Back to this session</Button></Link>
      </>
    );
  }

  // Slot picker (shared by both modes).
  const picker = (
    slots.length === 0 ? (
      <p className="text-sm text-muted mt-8">No open slots in the next 30 days. Please check back later.</p>
    ) : (
      <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_260px]">
        <div className="rounded-2xl border border-[--color-border] p-5">
          <CalendarPanel availableDates={availableDates} selectedDate={selectedDate} onSelect={(d) => { setSelectedDate(d); setSelectedSlot(null); }} />
        </div>
        <div className="rounded-2xl border border-[--color-border] p-5">
          {!selectedDate ? (
            <p className="text-sm text-muted">Pick a date to see open times.</p>
          ) : timeSlotsForDay.length === 0 ? (
            <p className="text-sm text-muted">No open times on this day.</p>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-brand-900 mb-1">{formatDate(selectedDate)}</h3>
              <p className="text-xs text-muted mb-3">{timeSlotsForDay.length} open · your time</p>
              <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
                {timeSlotsForDay.map((slot) => {
                  const active = selectedSlot?.slot_start === slot.slot_start;
                  return (
                    <button key={slot.slot_start} type="button" onClick={() => setSelectedSlot(slot)}
                      className={`px-4 py-2 rounded-lg border text-left text-sm font-medium transition-colors ${active ? 'border-brand-900 bg-brand-900 text-white' : 'border-[--color-border] hover:border-brand-500 hover:bg-brand-50'}`}>
                      {formatSlotTime(slot.slot_start)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div className="sm:col-span-2 flex flex-col gap-2">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!hasProposal && needsApproval ? (
            <>
              <p className="text-sm text-amber-900">This session is now within 24 hours, so a reschedule needs your mentor’s approval.</p>
              <Button onClick={sendRequest} loading={submitting} className="self-start">Send reschedule request</Button>
            </>
          ) : (
            <Button onClick={confirmReschedule} loading={submitting} disabled={!selectedSlot} className="self-start">
              <CalendarCheck className="h-4 w-4" /> Confirm new time
            </Button>
          )}
        </div>
      </div>
    )
  );

  // ── Mode 1: mentor proposed a time ──────────────────────────────────────────
  if (hasProposal) {
    return (
      <>
        {back}
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900">Pick your new time</h1>
        {offer?.range_start && offer?.range_end && (
          <p className="text-sm text-muted mt-1">
            Your mentor proposed <span className="text-foreground font-medium">{formatFullDateTime(offer.range_start)}</span> to{' '}
            <span className="text-foreground font-medium">{formatFullDateTime(offer.range_end)}</span> · {shortTz(TZ)}. No extra payment - your session is already paid.
          </p>
        )}
        <div className="mt-4">
          <button type="button" onClick={() => { setShowAll(v => !v); setSelectedSlot(null); if (!showAll) setSelectedDate(null); }}
            className="text-sm font-medium text-brand-700 hover:text-brand-900">
            {showAll ? '← Back to the proposed time' : 'None of these work? See all my available times'}
          </button>
        </div>
        {picker}
      </>
    );
  }

  // ── Mode 2: customer-initiated reschedule ───────────────────────────────────
  return (
    <>
      {back}
      <h1 className="text-2xl font-semibold tracking-tight text-brand-900">Reschedule your session</h1>
      {currentSlot && (
        <p className="text-sm text-muted mt-1 flex items-center gap-1.5">
          <Clock className="h-4 w-4" /> Current time: <span className="text-foreground font-medium">{formatFullDateTime(currentSlot)}</span> · {shortTz(TZ)}
        </p>
      )}

      {deadline === 'buffer' && (
        <div className="mt-6 rounded-xl border border-[--color-border] bg-brand-50/50 p-4 text-sm text-muted flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
          Changes are locked within 2 hours of the session. Please contact the other party directly.
        </div>
      )}

      {deadline === 'late' && (
        <div className="mt-6 flex flex-col gap-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
            <span>
              {deadline === 'buffer'
                ? "This session starts within 2 hours, so a reschedule needs the mentor's approval right away - they may not have time to respond."
                : "This session is within 24 hours, so a reschedule needs your mentor's approval. Send a request and they'll propose new times (it auto-approves if they don't respond in time)."}
            </span>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={sendRequest} loading={submitting} className="self-start">Send reschedule request</Button>
        </div>
      )}

      {(deadline === 'free' || deadline === null) && picker}
    </>
  );
}
