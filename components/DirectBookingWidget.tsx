'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Check, ChevronLeft, ChevronRight, Clock, Loader2, MessageSquare, Star, Video,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { PhoneInput } from './ui/PhoneInput';
import { RichText } from './ui/RichText';
import { isRichTextEmpty } from '../lib/sanitizeHtml';
import { createClient } from '../lib/supabase/client';
import { openRazorpayCheckout } from '../lib/razorpay';
import { detectCountry } from '../lib/geo';
import { BookingAccountPrompt } from './BookingAccountPrompt';
import { cn } from '../lib/utils';

const NOTES_MAX = 500;

// Customer country comes from detectCountry() (IP geo with a timezone fallback),
// which drives PPP + display currency in the price quote; the backend defaults to
// USD when it's absent/unrecognised.

// Basic client-side email shape check (guests type their own; logged-in users can
// still edit the prefilled value). Mirrors the backend's own @/. validation.
function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

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
  is_ppp: boolean;
}

// Localized display price for a service: original (pre-PPP) + discounted (post-PPP),
// both in the customer's currency. fxOk=false means FX was unavailable and the
// figures fell back to the mentor's currency.
interface DisplayPrice {
  original: number;
  discounted: number;
  currency: string;
  fxOk: boolean;
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
  smart_pricing?: boolean | null;
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

// Price in the customer's currency. When a fair-price (PPP) discount applies, the
// original is shown struck through beside the discounted amount. Falls back to the
// mentor-currency base price until the localized figure is available.
function PriceLabel({
  service, price, className,
}: { service: Service; price?: DisplayPrice; className?: string }) {
  if (service.set_price === 0) return <span className={className}>Free</span>;
  if (!price) return <span className={className}>{formatPrice(service.set_price, service.set_currency)}</span>;
  const discounted = price.discounted < price.original;
  return (
    <span className={cn('inline-flex items-baseline gap-1.5', className)}>
      {discounted && (
        <span className="text-muted font-normal line-through">{formatPrice(price.original, price.currency)}</span>
      )}
      <span>{formatPrice(price.discounted, price.currency)}</span>
    </span>
  );
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
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);   // guest "create account to book" popup
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
  const [phone, setPhone]           = useState('');
  const [notes, setNotes]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);
  const [bookingId, setBookingId]   = useState<string | null>(null);
  const [idemKey, setIdemKey]       = useState('');   // stable per booking attempt → server dedupes retries

  // Payments: when the platform toggle is on and the service is paid, bookings go
  // through the reserve → Razorpay → verify flow. Otherwise the direct-confirm path
  // below is used (free sessions, or before payments are switched on).
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [paying, setPaying]         = useState(false);      // Razorpay modal open / verifying

  // Localized display price per service id (customer currency + PPP discount), shown
  // before the Razorpay popup so the amount is never a surprise. The discounted value
  // equals what Razorpay actually charges.
  const [priceMap, setPriceMap]     = useState<Record<string, DisplayPrice>>({});

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

  // Convert all paid services to the customer's currency (with PPP) once loaded, so
  // each price and the summary show the localized original/discounted amount up front.
  // Best-effort: on any failure the UI falls back to the mentor-currency base price.
  useEffect(() => {
    const paid = (services ?? []).filter(s => s.set_price > 0);
    if (paid.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const country = await detectCountry();
        if (cancelled) return;
        const res = await fetch('/api/pricing/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            country: country ?? null,
            items: paid.map(s => ({ key: s.id, amount: s.set_price, from: s.set_currency, is_ppp: s.is_ppp })),
          }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const map: Record<string, DisplayPrice> = {};
        for (const p of (data.prices ?? [])) {
          map[p.key] = { original: p.you0, discounted: p.you, currency: p.customer_currency, fxOk: !!p.fx_ok };
        }
        if (!cancelled) setPriceMap(map);
      } catch { /* keep base-price fallback */ }
    })();
    return () => { cancelled = true; };
  }, [services]);

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
        // Prefill the phone from the mentee's profile so returning users don't retype it.
        const { data: prof } = await supabase.from('profiles').select('phone').eq('id', user.id).maybeSingle();
        if (prof?.phone) setPhone(prof.phone);
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

  // Is real (Razorpay) checkout on? Falls back to the direct path if unreachable.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/payments/config', { cache: 'no-store' });
        if (res.ok) { const d = await res.json(); setPaymentsEnabled(!!d.payments_enabled); }
      } catch { /* leave off → direct-confirm path */ }
    })();
  }, []);

  // BUG-025: bookings require an account. A guest first sees the account prompt; only
  // "Log in or sign up" opens the normal auth popup (which resumes this booking after
  // sign-in via the pendingBook effect above). "Not now" just closes - no guest booking.
  function handleConfirm() {
    if (isLoggedIn) { submitBooking(); return; }
    if (!email.trim()) { setFormError('Email is required.'); return; }
    if (!isValidEmail(email)) { setFormError('Please enter a valid email address.'); return; }
    if (phone.replace(/\D/g, '').length < 7) { setFormError('A valid phone number is required.'); return; }
    setFormError(null);
    setShowAccountPrompt(true);
  }

  // Guest chose to log in: open the normal auth popup (no banner) with the email prefilled;
  // the booking resumes on the same page after sign-in, right where they left off.
  function proceedToLogin() {
    setShowAccountPrompt(false);
    setPendingBook(true);
    router.push(`${pathname}?auth=open&email=${encodeURIComponent(email.trim())}`);
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
    setIdemKey(crypto.randomUUID());   // one key per chosen slot; reused across retries
    setStep('form');
    try {
      const res = await fetch(`/api/mentor/services/${selectedService!.id}/questions/public`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data ?? []);
      }
    } catch { /* questions are optional */ }
  }

  async function sessionAuthHeaders(): Promise<Record<string, string>> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }

  // Dispatcher: validate, then pick the paid (Razorpay) or direct-confirm path.
  async function submitBooking() {
    if (!selectedSlot || !selectedService) return;
    if (!email.trim()) { setFormError('Email is required.'); return; }
    if (!isValidEmail(email)) { setFormError('Please enter a valid email address.'); return; }
    if (phone.replace(/\D/g, '').length < 7) { setFormError('A valid phone number is required.'); return; }
    const missing = questions.find(q => q.is_required && !answers[q.id]?.trim());
    if (missing) { setFormError(`Please answer: "${missing.question_text}"`); return; }
    setFormError(null);
    if (paymentsEnabled && selectedService.set_price > 0) { void paidBookingFlow(); return; }
    void directBooking();
  }

  // Free session, or before payments are switched on: single-shot confirmed booking.
  async function directBooking() {
    if (!selectedSlot || !selectedService) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await sessionAuthHeaders()) },
        body: JSON.stringify({
          mentor_id:   mentor.id,
          service_id:  selectedService.id,
          slot_time:   selectedSlot.slot_start,
          email:       email.trim(),
          phone:       phone.trim(),
          name:        name.trim(),
          notes:       notes.trim(),
          timezone:    TZ,
          idempotency_key: idemKey,
          answers:     questions.map(q => ({ question_id: q.id, answer_text: answers[q.id] ?? '' })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.detail || 'Booking failed. Please try another slot.'); return; }
      setBookingId(data.booking_id);
      setStep('confirmed');
    } catch { setFormError('Could not complete the booking. Please try again.'); }
    finally { setSubmitting(false); }
  }

  // Paid path: quote → reserve (10-min hold) → Razorpay order → Checkout → verify.
  // Robust to a dropped webhook: /verify finalizes right after Checkout, and the
  // dispatcher's sweep is the backstop if even that call is lost.
  async function paidBookingFlow() {
    if (!selectedSlot || !selectedService) return;
    setSubmitting(true); setPaying(true);
    const fail = (msg: string) => { setFormError(msg); setSubmitting(false); setPaying(false); };
    try {
      const authHeaders = await sessionAuthHeaders();
      const answersJson = questions
        .map(q => ({ question_id: q.id, answer_text: answers[q.id] ?? '' }))
        .filter(a => a.answer_text);

      // 1. Binding price quote (customer currency + PPP).
      const country = await detectCountry();
      const qRes = await fetch(`/api/pricing/quote/${selectedService.id}${country ? `?country=${country}` : ''}`, { cache: 'no-store' });
      const quote = await qRes.json().catch(() => ({}));
      if (!qRes.ok || !quote.quote_id) { fail(quote.detail || 'Could not price this session. Please try again.'); return; }

      // 2. Reserve a 10-minute payment hold.
      const rRes = await fetch('/api/payments/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          quote_id: quote.quote_id,
          mentor_id: mentor.id,
          service_id: selectedService.id,
          slot_time: selectedSlot.slot_start,
          email: email.trim(),
          phone: phone.trim(),
          name: name.trim() || null,
          notes: notes.trim() || null,
          timezone: TZ,
          answers: answersJson,
          specific_availability_id: null,
        }),
      });
      const reserved = await rRes.json().catch(() => ({}));
      if (!rRes.ok || !reserved.booking_id) { fail(reserved.detail || 'That slot is no longer available. Please pick another time.'); return; }
      const newBookingId: string = reserved.booking_id;

      // 3. Create the Razorpay order.
      const oRes = await fetch('/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ booking_id: newBookingId }),
      });
      const order = await oRes.json().catch(() => ({}));
      if (!oRes.ok || !order.order_id) { fail(order.detail || 'Could not start the payment. Please try again.'); return; }

      // 4. Open Checkout. Outcomes arrive via handler (paid) / ondismiss (cancelled).
      const opened = await openRazorpayCheckout({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Immigroov',
        description: selectedService.title,
        prefill: { name: name.trim() || undefined, email: email.trim() },
        theme: { color: '#102a4c' },
        handler: async () => {
          try {
            // Webhook-independent confirmation. Whether or not this call lands, the
            // payment is captured and the webhook/sweep will finalize the booking,
            // so we always advance to the confirmed screen.
            await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...authHeaders },
              body: JSON.stringify({ order_id: order.order_id }),
            }).catch(() => {});
            setBookingId(newBookingId);
            setStep('confirmed');
          } finally { setSubmitting(false); setPaying(false); }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false); setPaying(false);
            setFormError('Payment cancelled. Your slot is held for 10 minutes if you want to try again.');
          },
        },
      });
      if (!opened) { fail('Could not load the payment window. Please check your connection and try again.'); }
    } catch {
      fail('Could not complete the payment. Please try again.');
    }
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
          {mentor.smart_pricing && (
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 font-medium">
              Fair pricing for your country
            </div>
          )}
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
                        <PriceLabel service={svc} price={priceMap[svc.id]} className="shrink-0 text-base font-semibold text-brand-700" />
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
                <PriceLabel service={selectedService} price={priceMap[selectedService.id]} className="text-lg font-semibold text-brand-900" />
              </div>
              {(() => {
                const p = priceMap[selectedService.id];
                if (!p || p.discounted >= p.original) return null;
                return (
                  <p className="-mt-1.5 text-[11px] font-medium text-amber-700 text-right">
                    Fair-price discount applied for your country
                  </p>
                );
              })()}

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
                        placeholder="you@email.com" autoComplete="email"
                        hint={email.trim() && !isValidEmail(email) ? undefined : "We'll send your confirmation here."} />
                      {email.trim() && !isValidEmail(email) && (
                        <p className="text-xs text-red-600 -mt-1.5">Please enter a valid email address.</p>
                      )}
                    </>
                  )}

                  <PhoneInput label="Phone number *" value={phone} onChange={setPhone}
                    hint="For session coordination. Include your country code." />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground">
                      What should your mentor prepare? <span className="text-muted font-normal">(optional)</span>
                    </label>
                    <textarea rows={3} maxLength={NOTES_MAX} value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="Share your goal or specific questions so your mentor can prepare."
                      className="px-3 py-2 rounded-lg bg-white text-sm text-foreground resize-none placeholder:text-muted shadow-[0_0_0_1px_rgba(15,23,42,0.06)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]" />
                  </div>

                  {formError && <p className="text-sm text-red-600">{formError}</p>}
                  <Button variant="accent" onClick={handleConfirm} loading={submitting || pendingBook || paying} disabled={!email.trim() || !isValidEmail(email) || !phone.trim()}>
                    {paymentsEnabled && selectedService.set_price > 0 ? 'Pay & confirm' : 'Confirm booking'}
                  </Button>
                  {paymentsEnabled && selectedService.set_price > 0 && (
                    <p className="text-[11px] text-muted leading-snug text-center">
                      Secure payment via Razorpay, charged in your local currency.
                    </p>
                  )}
                  {!isLoggedIn && (
                    <p className="text-[11px] text-muted leading-snug">
                      You&apos;ll be asked to log in or create a free account to complete your booking.
                    </p>
                  )}
                  <p className="text-[11px] text-muted text-center">You can cancel anytime · confirmation emailed</p>
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      {showAccountPrompt && (
        <BookingAccountPrompt onProceed={proceedToLogin} onDismiss={() => setShowAccountPrompt(false)} />
      )}
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
