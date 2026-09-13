'use client';
import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface BookingEvent {
  event: string;
  actor: 'user' | 'mentor' | 'system' | null;
  created_at: string;
}

// What happened to this booking, in order, and who did it.
//
// booking_events has recorded every lifecycle event since the beginning and nothing ever
// read it back. This is that record, shown to the people it is about: when a session moves
// or ends, both sides can see the sequence instead of asking support to reconstruct it.
//
// Collapsed by default. It is reference material for the times something looks wrong, not
// something to put between a reader and the session they came to look at.
const LABEL: Record<string, string> = {
  booked: 'Session booked',
  cancelled: 'Session cancelled',
  cancel_requested: 'Cancellation requested',
  rescheduled: 'Session moved',
  proposed: 'New time proposed',
  counter_proposed: 'Different time suggested',
  reschedule_requested: 'Reschedule requested',
  reschedule_approved: 'Reschedule approved',
  reschedule_rejected: 'Reschedule declined',
  no_show: 'Reported as a no-show',
};

function when(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function BookingEventLog(
  { bookingId, token, mentorName, candidateName, viewerIs }:
  { bookingId: string; token?: string | null; mentorName?: string | null;
    candidateName?: string | null; viewerIs: 'candidate' | 'mentor' | 'admin' },
) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<BookingEvent[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || events || failed) return;
    (async () => {
      const qs = token ? `?t=${encodeURIComponent(token)}` : '';
      const { ok, data } = await apiFetch<{ events: BookingEvent[] }>(
        `/api/booking/${bookingId}/events${qs}`);
      if (ok && Array.isArray(data?.events)) setEvents(data.events);
      else setFailed(true);
    })();
  }, [open, events, failed, bookingId, token]);

  // "You" wherever the viewer is the one who acted: reading your own name back at you in a
  // history of your own session is oddly impersonal.
  function actorName(actor: BookingEvent['actor']): string {
    if (!actor) return '';
    if (actor === 'system') return 'automatically';
    if (actor === 'mentor') return viewerIs === 'mentor' ? 'by you' : `by ${mentorName || 'the mentor'}`;
    return viewerIs === 'candidate' ? 'by you' : `by ${candidateName || 'the attendee'}`;
  }

  return (
    <div className="mt-6 border-t border-[--color-border] pt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <History className="h-4 w-4" />
        {open ? 'Hide history' : 'Show history'}
      </button>

      {open && (
        <div className="mt-3">
          {failed && <p className="text-sm text-muted">Could not load the history.</p>}
          {!failed && events === null && <p className="text-sm text-muted">Loading…</p>}
          {events?.length === 0 && (
            <p className="text-sm text-muted">Nothing has changed since this session was booked.</p>
          )}
          {events && events.length > 0 && (
            <ol className="flex flex-col gap-2.5">
              {events.map((e, i) => (
                <li key={`${e.created_at}-${i}`} className="flex items-baseline gap-3 text-sm">
                  <span className="shrink-0 text-xs text-muted/80 tabular-nums w-[10.5rem]">
                    {when(e.created_at)}
                  </span>
                  <span className="min-w-0 text-foreground">
                    {LABEL[e.event] ?? e.event.replace(/_/g, ' ')}
                    {/* Older rows predate the actor column; they say what happened without
                        inventing who did it. */}
                    {e.actor && <span className="text-muted"> {actorName(e.actor)}</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
