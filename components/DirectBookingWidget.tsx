'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Check, ChevronLeft, ChevronRight, Clock, Loader2, MessageSquare, Star, Video,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { RichText } from './ui/RichText';
import { isRichTextEmpty } from '../lib/sanitizeHtml';
import { createClient } from '../lib/supabase/client';
import { cn } from '../lib/utils';

const NOTES_MAX = 500;

// ── Types ──────────────────────────────────────────────────────────────────────

interface Service {
  id: string;
  title: string;
  description: string | null;
  type: 'video' | 'dm';
  duration: number;
  category: string | null;
  set_price: number;
  set_currency: string;
}

interface Slot { slot_start: string; slot_end: string; }

interface Question {
  id: string;
  question_text: string;
  is_required: boolean;
  question_type: 'text' | 'multiple_choice' | 'yes_no';
}

interface MentorInfo {
  id: string;
  slug: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  photo_url: string | null;
  avg_rating?: number | null;
  review_count?: number | null;
}

type Step = 'service' | 'datetime' | 'form' | 'confirmed';

// ── Calendar helpers ───────────────────────────────────────────────────────────

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function slotDateKey(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('en-CA', { timeZone: TZ });
}

function buildGrid(year: number, month: number): (Date | null)[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const grid: (Date | null)[] = Array(firstWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(year, month, d));
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatSlotTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString(undefined, {
    timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function formatSlotTimeInTz(isoStr: string, tz: string): string {
  return new Date(isoStr).toLocaleTimeString(undefined, {
    timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

// "Europe/Amsterdam" → "Amsterdam"
function shortTz(tz: string): string {
  return tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
}

// Step progress header (Service → Date & time → Confirm).
function StepBar({ step }: { step: Step }) {
  const steps = [
    { key: 'service', label: 'Service' },
    { key: 'datetime', label: 'Date & time' },
    { key: 'form', label: 'Confirm' },
  ] as const;
  const idx = steps.findIndex((s) => s.key === step);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <span className={cn(
              'h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
              done ? 'bg-emerald-500 text-white' : active ? 'bg-brand-900 text-white' : 'bg-brand-100 text-muted',
            )}>
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn('text-sm font-medium', active || done ? 'text-brand-900' : 'text-muted')}>{s.label}</span>
            {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted/40 mx-1 shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatPrice(price: number, currency: string): string {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

// ── Calendar panel ─────────────────────────────────────────────────────────────

function CalendarPanel({
  availableDates, selectedDate, onSelect,
}: {
  availableDates: Set<string>; selectedDate: string | null; onSelect: (d: string) => void;
}) {
  const now = new Date();
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  useEffect(() => {
    if (availableDates.size === 0) return;
    const [y, m] = Array.from(availableDates).sort()[0].split('-').map(Number);
    setViewYear(y); setViewMonth(m - 1);
  }, [availableDates]);

  const grid     = useMemo(() => buildGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const todayKey = dateKey(now);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1); }
    else setViewMonth(m => m + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-brand-900">
          <span className="font-bold">{MONTH_NAMES[viewMonth]}</span>{' '}
          <span className="font-normal text-muted">{viewYear}</span>
        </h3>
        <div className="flex gap-1">
          <button type="button" onClick={prevMonth}
            className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-brand-50 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={nextMonth}
            className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-brand-50 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-xs font-medium text-muted py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {grid.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />;
          const k        = dateKey(date);
          const hasSlots = availableDates.has(k);
          const past     = k < todayKey;
          const selected = k === selectedDate;
          return (
            <div key={k} className="flex justify-center">
              <button
                type="button"
                disabled={past || !hasSlots}
                onClick={() => onSelect(k)}
                className={cn(
                  'relative w-9 h-9 rounded-full text-sm font-medium transition-colors',
                  selected          ? 'bg-brand-900 text-white'
                  : hasSlots && !past ? 'bg-brand-50 text-brand-900 hover:bg-brand-100 font-semibold'
                  : 'text-muted/40 cursor-not-allowed',
                )}
              >
                {date.getDate()}
                {k === todayKey && !selected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────────

interface Props {
  mentor: MentorInfo;
  mentorTimezone?: string;
}

export function DirectBookingWidget({ mentor, mentorTimezone }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const showMentorTz = !!mentorTimezone && mentorTimezone !== TZ;
  const [isLoggedIn, setIsLoggedIn]       = useState(false);
  const [pendingBook, setPendingBook]     = useState(false);
  const [step, setStep]                   = useState<Step>('service');
  const [services, setServices]           = useState<Service[] | null>(null);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [slots, setSlots]               = useState<Slot[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError]     = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [questions, setQuestions]   = useState<Question[]>([]);
  const [answers, setAnswers]       = useState<Record<string, string>>({});
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [notes, setNotes]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);
  const [bookingId, setBookingId]   = useState<string | null>(null);

  // Load services
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/mentors/${mentor.slug}/services`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) { setServicesError('Could not load services.'); return; }
        setServices(data.services ?? []);
      } catch { setServicesError('Could not load services.'); }
    })();
  }, [mentor.slug]);

  // Pre-fill name/email from session + track auth state.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        setEmail(user.email ?? '');
        const fn = user.user_metadata?.full_name || user.user_metadata?.name;
        if (typeof fn === 'string') setName(fn);
      }
    })();
  }, []);

  // Guest/sign-in from the popup completes → capture the session identity.
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'SIGNED_IN' || !session?.user) return;
      setIsLoggedIn(true);
      setEmail(session.user.email ?? '');
      const fn = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
      if (typeof fn === 'string' && fn) setName(fn);
    });
    return () => subscription.unsubscribe();
  }, []);

  // After the popup signs them in, finish the booking they were mid-way through.
  useEffect(() => {
    if (isLoggedIn && pendingBook && selectedSlot) { setPendingBook(false); submitBooking(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, pendingBook]);

  // Not logged in: an email with an existing account must log in first; any other
  // email books directly as a guest (the confirmation email verifies the address).
  async function handleConfirm() {
    if (isLoggedIn) { submitBooking(); return; }
    if (!email.trim()) { setFormError('Email is required.'); return; }
    setFormError(null); setSubmitting(true);
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      setSubmitting(false);
      if (data.has_password) { setPendingBook(true); router.push(`${pathname}?auth=open`); }
      else submitBooking();               // new email → guest booking
    } catch {
      setSubmitting(false);
      submitBooking();
    }
  }

  // Load slots when a service is selected
  async function selectService(svc: Service) {
    setSelectedService(svc);
    setSlots(null);
    setSlotsError(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSlotsLoading(true);
    setStep('datetime');
    try {
      const today = new Date();
      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + 30);
      const from = today.toLocaleDateString('en-CA');
      const to   = maxDate.toLocaleDateString('en-CA');
      const res = await fetch(
        `/api/booking/slots/${mentor.id}/${svc.id}?from_date=${from}&to_date=${to}`,
        { cache: 'no-store' },
      );
      const data = await res.json();
      if (!res.ok) { setSlotsError(data.detail || 'Could not load slots.'); return; }
      setSlots(data.slots ?? []);
    } catch { setSlotsError('Could not load available slots.'); }
    finally { setSlotsLoading(false); }
  }

  // Load questions when moving to form
  async function selectSlot(slot: Slot) {
    setSelectedSlot(slot);
    setStep('form');
    try {
      const res = await fetch(`/api/mentor/services/${selectedService!.id}/questions/public`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data ?? []);
      }
    } catch { /* questions are optional */ }
  }

  // Submit booking — quote -> reserve (10-min payment hold) -> confirm.
  // A binding price quote is required before a hold can be reserved; the
  // quote is single-use, so retrying this whole sequence never double-books
  // (a re-used quote_id is rejected server-side).
  async function submitBooking() {
    if (!selectedSlot || !selectedService) return;
    if (!email.trim()) { setFormError('Email is required.'); return; }
    const missing = questions.find(q => q.is_required && !answers[q.id]?.trim());
    if (missing) { setFormError(`Please answer: "${missing.question_text}"`); return; }
    setFormError(null);
    setSubmitting(true);
    try {
      const quoteRes = await fetch(`/api/pricing/quote/${selectedService.id}`, { cache: 'no-store' });
      const quote = await quoteRes.json();
      if (!quoteRes.ok) { setFormError(quote.detail || 'Could not price this session. Please try again.'); return; }

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      // Referral attribution: /r/[slug] drops an `ig_ref` cookie on click.
      // reserve_booking resolves this into a commission via
      // resolve_referral_attribution — matching immigroov's own cookie-based
      // click-to-booking attribution (see app/r/[slug]/route.ts).
      const referralSessionToken = document.cookie
        .split('; ')
        .find((c) => c.startsWith('ig_ref='))
        ?.split('=')[1];
      const reserveRes = await fetch('/api/payments/reserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          quote_id:    quote.quote_id,
          mentor_id:   mentor.id,
          service_id:  selectedService.id,
          slot_time:   selectedSlot.slot_start,
          email:       email.trim(),
          name:        name.trim(),
          notes:       notes.trim(),
          timezone:    TZ,
          answers:     questions.map(q => ({ question_id: q.id, answer_text: answers[q.id] ?? '' })),
          ...(referralSessionToken ? { referral_session_token: referralSessionToken } : {}),
        }),
      });
      const reserved = await reserveRes.json();
      if (!reserveRes.ok) { setFormError(reserved.detail || 'Booking failed. Please try another slot.'); return; }

      const configRes = await fetch('/api/payments/config', { cache: 'no-store' });
      const { payments_enabled } = await configRes.json();
      if (payments_enabled) {
        // Real Razorpay checkout isn't wired into this widget yet — the hold
        // still expires in 10 minutes if nothing confirms it.
        setFormError('Online payment isn’t available for this session yet — please contact the mentor directly to arrange payment.');
        return;
      }

      const confirmRes = await fetch('/api/payments/confirm-mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: reserved.booking_id }),
      });
      const confirmed = await confirmRes.json();
      if (!confirmRes.ok) { setFormError(confirmed.detail || 'Could not confirm the booking. Please try again.'); return; }

      setBookingId(reserved.booking_id);
      setStep('confirmed');
    } catch { setFormError('Could not complete the booking. Please try again.'); }
    finally { setSubmitting(false); }
  }

  // Slot grouping
  const slotsByDate = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots ?? []) {
      const k = slotDateKey(s.slot_start);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return map;
  }, [slots]);
  const availableDates   = useMemo(() => new Set(slotsByDate.keys()), [slotsByDate]);
  const timeSlotsForDay  = selectedDate ? (slotsByDate.get(selectedDate) ?? []) : [];
  const initials         = mentor.display_name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase();

  function bookAnotherTime() {
    setBookingId(null);
    setSelectedSlot(null);
    setStep('datetime');
  }

  // ── Confirmed state ──────────────────────────────────────────────────────────
  if (step === 'confirmed') {
    return (
      <div className="rounded-2xl border border-[--color-border] bg-white text-center px-6 py-12 max-w-lg mx-auto">
        <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center">
          <Check className="h-7 w-7 text-emerald-500" />
        </div>
        <h2 className="text-xl font-semibold text-brand-900 mt-4">You&apos;re booked!</h2>
        {selectedService && selectedSlot && (
          <p className="text-sm font-semibold text-foreground mt-2">
            {selectedService.title} · {formatDate(slotDateKey(selectedSlot.slot_start))}, {formatSlotTime(selectedSlot.slot_start)}
          </p>
        )}
        <p className="text-xs text-muted mt-2">
          Your time ({shortTz(TZ)}) · a confirmation has been emailed to {email}.
          {showMentorTz && selectedSlot && <> Mentor&apos;s time: {formatSlotTimeInTz(selectedSlot.slot_start, mentorTimezone!)}.</>}
        </p>
        <div className="flex flex-wrap gap-2 justify-center mt-6">
          {bookingId && (
            <Link href={`/meeting/${bookingId}`}><Button variant="primary"><Video className="h-4 w-4" /> Join meeting</Button></Link>
          )}
          <Link href="/account/sessions"><Button variant="outline">View my sessions</Button></Link>
          <Button variant="ghost" onClick={bookAnotherTime}>Book another time</Button>
        </div>
        <p className="text-xs text-muted mt-5">
          Manage or reschedule anytime under{' '}
          <Link href="/account/sessions" className="underline hover:text-foreground">My sessions</Link>.
        </p>
      </div>
    );
  }

  function changeService() {
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSlots(null);
    setStep('service');
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header: identity + rating + timezones ─────────────────── */}
      <div className="rounded-2xl border border-[--color-border] bg-white p-5 sm:p-6 flex flex-wrap items-center gap-4">
        {mentor.photo_url ? (
          <img src={mentor.photo_url} alt={mentor.display_name} className="h-16 w-16 rounded-full object-cover shrink-0" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-brand-700 to-accent-500 flex items-center justify-center text-white text-lg font-semibold shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-brand-900 truncate">{mentor.display_name}</h1>
          {mentor.headline && <p className="text-sm text-muted mt-0.5 line-clamp-2">{mentor.headline}</p>}
          {typeof mentor.avg_rating === 'number' && mentor.avg_rating > 0 && (
            <p className="text-sm font-medium text-amber-600 mt-1 flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {mentor.avg_rating.toFixed(1)}
              <span className="text-muted font-normal">({mentor.review_count ?? 0} reviews)</span>
            </p>
          )}
        </div>
        <div className="text-xs text-muted sm:text-right sm:ml-auto shrink-0">
          <div>Your time <span className="font-semibold text-foreground">{shortTz(TZ)}</span></div>
          {showMentorTz && <div className="mt-0.5">Mentor <span className="font-semibold text-foreground">{shortTz(mentorTimezone!)}</span></div>}
        </div>
      </div>

      {/* ── Bio ───────────────────────────────────────────────────── */}
      {mentor.bio && !isRichTextEmpty(mentor.bio) && <RichText html={mentor.bio} className="max-w-3xl" />}

      {/* ── Stepper ───────────────────────────────────────────────── */}
      <StepBar step={step} />

      {/* ── Booking: content | summary ────────────────────────────── */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        {/* CONTENT: service list, or calendar + slots once a service is picked */}
        <div className="min-w-0">
          {!selectedService ? (
            <div className="rounded-2xl border border-[--color-border] bg-white p-5 sm:p-6">
              <h3 className="text-base font-semibold text-brand-900 mb-4">Choose a service</h3>
              {servicesError ? (
                <p className="text-sm text-red-600">{servicesError}</p>
              ) : services === null ? (
                <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading services…</div>
              ) : services.length === 0 ? (
                <p className="text-sm text-muted">{mentor.display_name.split(' ')[0]} hasn&apos;t set up sessions yet. Check back soon.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {services.map(svc => (
                    <button key={svc.id} type="button" onClick={() => selectService(svc)}
                      className="text-left rounded-xl border border-[--color-border] p-4 hover:border-brand-400 hover:bg-brand-50/60 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {svc.type === 'video'
                              ? <Video className="h-4 w-4 text-brand-600 shrink-0" />
                              : <MessageSquare className="h-4 w-4 text-brand-600 shrink-0" />}
                            <span className="text-sm font-semibold text-foreground">{svc.title}</span>
                          </div>
                          {svc.description && <p className="text-xs text-muted leading-relaxed line-clamp-2">{svc.description}</p>}
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                            <Clock className="h-3 w-3" />{svc.duration} min · {svc.type === 'video' ? 'Video call' : 'Direct message'}
                            {svc.category && <span>· {svc.category}</span>}
                          </div>
                        </div>
                        <span className="shrink-0 text-base font-semibold text-brand-700">{formatPrice(svc.set_price, svc.set_currency)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-[--color-border] bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-base font-semibold text-brand-900">Pick a date &amp; time</h3>
                <button type="button" onClick={changeService} className="text-xs font-medium text-brand-700 hover:underline shrink-0">Change service</button>
              </div>
              {slotsError ? (
                <p className="text-sm text-red-600">{slotsError}</p>
              ) : slotsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading availability…</div>
              ) : slots && slots.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">No open slots in the next 30 days.<br /><span className="text-xs">Check back later.</span></p>
              ) : slots ? (
                <div className="grid sm:grid-cols-[minmax(0,280px)_1fr] gap-6 items-start">
                  <CalendarPanel
                    availableDates={availableDates}
                    selectedDate={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setSelectedSlot(null); if (step === 'form') setStep('datetime'); }}
                  />
                  <div className="min-w-0">
                    {!selectedDate ? (
                      <p className="text-sm text-muted pt-1">Select a highlighted date to see open times.</p>
                    ) : (
                      <>
                        <h4 className="text-sm font-semibold text-brand-900">{formatDate(selectedDate)}</h4>
                        <p className="text-xs text-muted mb-3">{timeSlotsForDay.length} open · your time</p>
                        <div className="grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
                          {timeSlotsForDay.map(slot => {
                            const sel = selectedSlot?.slot_start === slot.slot_start;
                            return (
                              <button key={slot.slot_start} type="button" onClick={() => selectSlot(slot)}
                                className={cn('flex flex-col gap-0.5 px-3 py-2 rounded-lg border text-left transition-colors',
                                  sel ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-[--color-border] hover:border-brand-500 hover:bg-brand-50')}>
                                <span className="text-sm font-medium text-foreground">{formatSlotTime(slot.slot_start)}</span>
                                {showMentorTz && <span className="text-[11px] text-muted">mentor {formatSlotTimeInTz(slot.slot_start, mentorTimezone!)}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* SUMMARY: booking details + confirm form (guest fields only when logged out) */}
        <aside className="rounded-2xl border border-[--color-border] bg-white p-5 flex flex-col gap-3 lg:sticky lg:top-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Your booking</p>
          {!selectedService ? (
            <p className="text-sm text-muted">Pick a service to get started.</p>
          ) : (
            <>
              <div>
                <p className="font-semibold text-foreground">{selectedService.title}</p>
                <p className="text-sm text-muted">{selectedService.duration} min · {selectedService.type === 'video' ? 'Video call' : 'Direct message'}</p>
              </div>
              <div className="border-y border-[--color-border] py-3 flex flex-col gap-1.5">
                <Row k="When" v={selectedSlot ? `${formatDate(slotDateKey(selectedSlot.slot_start))}, ${formatSlotTime(selectedSlot.slot_start)}` : '—'} />
                {showMentorTz && <Row k="Mentor's time" v={selectedSlot ? formatSlotTimeInTz(selectedSlot.slot_start, mentorTimezone!) : '—'} />}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Total</span>
                <span className="text-lg font-semibold text-brand-900">{formatPrice(selectedService.set_price, selectedService.set_currency)}</span>
              </div>

              {selectedSlot && (
                <div className="border-t border-[--color-border] pt-3 flex flex-col gap-3">
                  {questions.map(q => (
                    <div key={q.id} className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-foreground">
                        {q.question_text}{q.is_required && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      {q.question_type === 'yes_no' ? (
                        <div className="flex gap-3">
                          {['Yes', 'No'].map(opt => (
                            <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                              <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt}
                                onChange={() => setAnswers(a => ({ ...a, [q.id]: opt }))} />
                              {opt}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <textarea rows={2} value={answers[q.id] ?? ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                          className="px-3 py-2 rounded-lg bg-white text-sm text-foreground resize-none placeholder:text-muted shadow-[0_0_0_1px_rgba(15,23,42,0.06)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]" />
                      )}
                    </div>
                  ))}

                  {isLoggedIn ? (
                    <p className="text-sm text-muted">Booking as <span className="font-medium text-foreground">{email}</span>.</p>
                  ) : (
                    <>
                      <Input label="Your name" value={name} onChange={e => setName(e.target.value)} placeholder="Optional" autoComplete="name" />
                      <Input label="Email *" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="you@email.com" autoComplete="email" hint="We'll send your confirmation here." />
                    </>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground">
                      What should your mentor prepare? <span className="text-muted font-normal">(optional)</span>
                    </label>
                    <textarea rows={3} maxLength={NOTES_MAX} value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="Share your goal or specific questions so your mentor can prepare."
                      className="px-3 py-2 rounded-lg bg-white text-sm text-foreground resize-none placeholder:text-muted shadow-[0_0_0_1px_rgba(15,23,42,0.06)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]" />
                  </div>

                  {formError && <p className="text-sm text-red-600">{formError}</p>}
                  <Button variant="accent" onClick={handleConfirm} loading={submitting || pendingBook} disabled={!email.trim()}>
                    Confirm booking
                  </Button>
                  {!isLoggedIn && (
                    <p className="text-[11px] text-muted leading-snug">
                      Booking as a guest. If this email already has an account you&apos;ll be asked to log in.
                    </p>
                  )}
                  <p className="text-[11px] text-muted text-center">You can cancel anytime · confirmation emailed</p>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted shrink-0">{k}</span>
      <span className="font-medium text-foreground text-right">{v}</span>
    </div>
  );
}
