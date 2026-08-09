'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Bell, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Loader2, MapPin, MessageSquare, Star, Video,
} from 'lucide-react';
import { REMINDER_NOTICE } from '../lib/content';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { PhoneInput } from './ui/PhoneInput';
import { RichText } from './ui/RichText';
import { isRichTextEmpty, richTextToPlain } from '../lib/sanitizeHtml';
import { createClient } from '../lib/supabase/client';
import { startPaidCheckout } from '../lib/checkout';
import { detectCountry, pricingCountry } from '../lib/geo';
import { tzShort, tzCity, tzOffset, userDisplayTz, mentorDisplayTz } from '../lib/timezone';
import { countryLabel } from '../lib/countries';
import { languageLabel } from '../lib/languages';
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

// Per-country phone validity (length + format), from the same libphonenumber the PhoneInput uses. The
// stored value is "{dial} {national}" (e.g. "+31 612345678"), which parses to the right country.
function isValidPhone(phone: string): boolean {
  try { return isValidPhoneNumber(phone.trim()); } catch { return false; }
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

// The customer's own line-item breakdown from the binding quote (session price = localised mentor
// rate, platform fee added on top, tax on session+fee, total). The internal mentor commission +
// mentor's raw rate stay redacted server-side.
interface QuoteBreakdown {
  mentor_amount: number; platform_fee: number; platform_fee_pct: number;
  tax_amount: number; tax_pct: number;
  gross_customer: number; customer_currency: string;
}

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
  city?: string | null;
  country?: string | null;
  avg_rating?: number | null;
  review_count?: number | null;
  smart_pricing?: boolean | null;
  // BUG-100: profile facts the booking page was missing entirely for mentors with direct booking.
  home_country_code?: string | null;
  years_lived_experience?: number | null;
  languages?: string[];
  professional_domains?: string[];
  expertise_country_codes?: string[];
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

// 24-hour clock throughout the booking flow (e.g. "14:30"), so the customer's time and the
// mentor's time read the same way and there's no AM/PM ambiguity across zones.
function formatSlotTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function formatSlotTimeInTz(isoStr: string, tz: string): string {
  return new Date(isoStr).toLocaleTimeString('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  });
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
  service, price, priceReady = true, className,
}: { service: Service; price?: DisplayPrice; priceReady?: boolean; className?: string }) {
  if (service.set_price === 0) return <span className={className}>Free</span>;
  // Skeleton until the backend-localized figure is in, so the page never flashes the raw mentor
  // currency (e.g. INR) before correcting to the customer's currency.
  if (!priceReady) return <span className={cn('inline-block h-[1em] w-14 rounded bg-neutral-100 animate-pulse align-middle', className)} aria-hidden />;
  if (!price) return <span className={className}>{formatPrice(service.set_price, service.set_currency)}</span>;
  // Strike the original ONLY when fair pricing made the price LOWER (a real discount). When PPP
  // raises the price (or leaves it equal at display precision) show just the final amount - showing
  // a cheaper struck-out price next to a higher charge would read as a markup, not a deal.
  const discounted = price.discounted < price.original
    && formatPrice(price.original, price.currency) !== formatPrice(price.discounted, price.currency);
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
  const [isLoggedIn, setIsLoggedIn]       = useState(false);
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);   // guest "create account to book" popup
  const [checkingEmail, setCheckingEmail] = useState(false);          // verifying if the guest's email is already registered
  const [emailExists, setEmailExists]   = useState(false);            // the entered email already has an account
  const [emailOauthOnly, setEmailOauthOnly] = useState(false);        // that account signs in with Google (no password)
  const [step, setStep]                   = useState<Step>('service');
  const [services, setServices]           = useState<Service[] | null>(null);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [slots, setSlots]               = useState<Slot[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError]     = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [bioExpanded, setBioExpanded]   = useState(false);
  const bioRef = useRef<HTMLDivElement>(null);
  const [bioOverflows, setBioOverflows] = useState(false);
  // Only offer "Read more" when the bio is actually taller than the clamp. Re-measure after paint
  // and after the (serif) web font settles - a first measure before the font loads under-counts the
  // lines, which is why a clearly-clamped bio was showing no button.
  useEffect(() => {
    const el = bioRef.current;
    if (!el) return;
    const measure = () => setBioOverflows(el.scrollHeight - el.clientHeight > 2);
    measure();
    const raf = requestAnimationFrame(measure);
    const fonts = (document as { fonts?: { ready?: Promise<unknown> } }).fonts;
    fonts?.ready?.then(measure).catch(() => {});
    return () => cancelAnimationFrame(raf);
  }, [mentor.bio]);

  // Persist the in-progress booking so it survives a login redirect - including Google OAuth, which
  // fully navigates away and back. Restored on mount below.
  const draftKey = `ig_booking_draft_${mentor.slug}`;
  const restoreSlotRef = useRef<string | null>(null);
  const resumeReviewRef = useRef(false);
  function saveDraft(serviceId: string, slotStart?: string | null) {
    try {
      const prev = JSON.parse(sessionStorage.getItem(draftKey) || '{}');
      sessionStorage.setItem(draftKey, JSON.stringify({ ...prev, serviceId, slotStart: slotStart ?? null }));
    } catch { /* ignore */ }
  }
  // Persist the FULL checkout state (contact fields + "was at the review popup") before an auth
  // redirect, so the customer resumes at the payment-breakdown popup after signing in instead of
  // starting over - even if the page fully remounts (OAuth, or a refresh race on sign-in). BUG-078.
  function saveResumeDraft() {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({
        serviceId: selectedService?.id ?? null,
        slotStart: selectedSlot?.slot_start ?? null,
        name: name.trim(), phone: phone.trim(), email: email.trim(), resume: true,
      }));
    } catch { /* ignore */ }
  }
  function clearDraft() { try { sessionStorage.removeItem(draftKey); } catch { /* ignore */ } }

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

  // Review & confirm popup: the price breakdown (service price + fee + tax + total) shown before the
  // final booking, with a referral-code field and a Modify (back to slot) option.
  const [showReview, setShowReview]       = useState(false);
  const [reviewQuote, setReviewQuote]     = useState<QuoteBreakdown | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [referralCode, setReferralCode]   = useState('');
  const [referralInfo, setReferralInfo]   = useState<{ discount_pct: number; code: string } | null>(null);
  const [referralChecking, setReferralChecking] = useState(false);
  const [referralMsg, setReferralMsg]     = useState<string | null>(null);

  // Payments: when the platform toggle is on and the service is paid, bookings go
  // through the reserve → Razorpay → verify flow. Otherwise the direct-confirm path
  // below is used (free sessions, or before payments are switched on).
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [paying, setPaying]         = useState(false);      // Razorpay modal open / verifying

  // Localized display price per service id (customer currency + PPP discount), shown
  // before the Razorpay popup so the amount is never a surprise. The discounted value
  // equals what Razorpay actually charges.
  const [priceMap, setPriceMap]     = useState<Record<string, DisplayPrice>>({});
  // Prices render only once the backend-localized figures are in, so the booking page never flashes
  // the raw mentor-currency amount before correcting to the customer's currency.
  const [priceReady, setPriceReady] = useState(false);

  // The visitor's country (edge/IP geo). Used to label their timezone with their actual
  // location's city and to keep PPP consistent with what they're shown.
  const [userCountry, setUserCountry] = useState<string | undefined>(undefined);
  useEffect(() => { detectCountry().then(c => { if (c) setUserCountry(c); }); }, []);

  // Timezones to DISPLAY (labels + slot conversions). userTz prefers the visitor's
  // location city when its offset matches the browser clock, so "your time" agrees with
  // the location badge (Tilburg -> Amsterdam, not the OS's Berlin). mentorTz falls back to
  // the mentor's country when their stored zone is a bare 'UTC', so it shows a real city.
  const userTz = userDisplayTz(TZ, userCountry);
  const mentorTz = mentorDisplayTz(mentorTimezone, mentor.country);
  const showMentorTz = !!mentorTz && tzOffset(mentorTz) !== tzOffset(userTz);

  // Load services
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/mentors/${mentor.slug}/services`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) { setServicesError('Could not load services.'); return; }
        const list: Service[] = data.services ?? [];
        setServices(list);
        // Restore an in-progress booking after a login redirect: re-select the service (which
        // loads its slots), and remember the saved slot for the slot-restore effect below.
        try {
          const raw = sessionStorage.getItem(draftKey);
          if (raw) {
            const draft = JSON.parse(raw) as {
              serviceId?: string; slotStart?: string | null;
              name?: string; phone?: string; email?: string; resume?: boolean;
            };
            const svc = list.find((s) => s.id === draft.serviceId);
            if (svc) { restoreSlotRef.current = draft.slotStart ?? null; selectService(svc); }
            // Restore the contact fields the guest already typed, and whether they were at the review
            // popup, so a post-login return resumes exactly there (BUG-078).
            if (draft.name) setName(draft.name);
            if (draft.phone) setPhone(draft.phone);
            if (draft.email) setEmail(draft.email);
            if (draft.resume) resumeReviewRef.current = true;
          }
        } catch { /* ignore a bad draft */ }
      } catch { setServicesError('Could not load services.'); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentor.slug]);

  // When slots arrive during a restore, pick the saved slot and jump to the form step.
  useEffect(() => {
    if (!restoreSlotRef.current || !slots) return;
    const slot = slots.find((s) => s.slot_start === restoreSlotRef.current);
    restoreSlotRef.current = null;
    if (slot) selectSlot(slot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  // Convert all paid services to the customer's currency (with PPP) once loaded, so
  // each price and the summary show the localized original/discounted amount up front.
  // Best-effort: on any failure the UI falls back to the mentor-currency base price.
  useEffect(() => {
    if (services === null) return;   // services still loading; keep the skeleton up
    const paid = services.filter(s => s.set_price > 0);
    if (paid.length === 0) { setPriceReady(true); return; }
    let cancelled = false;
    setPriceReady(false);
    (async () => {
      try {
        const country = await pricingCountry();
        if (cancelled) return;
        // Price each service through the SAME per-service engine as checkout (display_service_prices),
        // so the session price shown here equals the session line at checkout - only the platform fee
        // and tax are added there (BUG-077).
        const res = await fetch('/api/pricing/display', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            country: country ?? null,
            service_ids: paid.map(s => s.id),
          }),
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          const map: Record<string, DisplayPrice> = {};
          for (const p of (data.prices ?? [])) {
            map[p.key] = { original: p.you0, discounted: p.you, currency: p.customer_currency, fxOk: !!p.fx_ok };
          }
          if (!cancelled) setPriceMap(map);
        }
      } catch { /* keep base-price fallback */ }
      finally { if (!cancelled) setPriceReady(true); }
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

  // After signing in, resume the booking exactly where they left off: the review / payment-breakdown
  // popup. Driven by the PERSISTED draft flag (not in-memory state), so it survives the sign-in
  // navigation/refresh race and even a full remount (OAuth). BUG-078: previously the whole flow was
  // lost and the customer had to start over.
  useEffect(() => {
    if (resumeReviewRef.current && isLoggedIn && selectedService && selectedSlot && !showReview) {
      resumeReviewRef.current = false;
      try {
        const prev = JSON.parse(sessionStorage.getItem(draftKey) || '{}');
        delete prev.resume;   // one-shot: don't re-pop the review on a later manual revisit
        sessionStorage.setItem(draftKey, JSON.stringify(prev));
      } catch { /* ignore */ }
      openReview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, selectedService, selectedSlot]);

  // Is real (Razorpay) checkout on? Falls back to the direct path if unreachable.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/payments/config', { cache: 'no-store' });
        if (res.ok) { const d = await res.json(); setPaymentsEnabled(!!d.payments_enabled); }
      } catch { /* leave off → direct-confirm path */ }
    })();
  }, []);

  // Open the review popup: validate the form, then fetch the binding price breakdown (paid sessions)
  // so the customer sees exactly what they'll be charged before confirming. All amounts come from the
  // backend quote; the frontend only displays them.
  async function openReview() {
    if (!selectedService || !selectedSlot) return;
    if (!email.trim()) { setFormError('Email is required.'); return; }
    if (!isValidEmail(email)) { setFormError('Please enter a valid email address.'); return; }
    if (!isLoggedIn && !name.trim()) { setFormError('Please enter your name.'); return; }
    if (!isValidPhone(phone)) { setFormError('Please enter a valid phone number for the selected country.'); return; }
    const missing = questions.find(q => q.is_required && !answers[q.id]?.trim());
    if (missing) { setFormError(`Please answer: "${missing.question_text}"`); return; }
    setFormError(null);
    setReviewQuote(null);
    setShowReview(true);
    if (selectedService.set_price > 0) {
      setReviewLoading(true);
      try {
        const country = await pricingCountry();
        const res = await fetch(`/api/pricing/quote/${selectedService.id}${country ? `?country=${country}` : ''}`, { cache: 'no-store' });
        const q = await res.json().catch(() => ({}));
        if (res.ok && q && q.gross_customer != null) setReviewQuote(q as QuoteBreakdown);
      } catch { /* fall back to the summary total */ }
      finally { setReviewLoading(false); }
    }
  }

  function referralReason(reason?: string): string {
    switch (reason) {
      case 'expired': return 'That code has expired.';
      case 'inactive': return 'That code is no longer active.';
      case 'cap_reached': return 'That code has reached its usage limit.';
      case 'affiliate_inactive': return 'That code is no longer active.';
      default: return 'That code is not valid.';
    }
  }

  // Validate the referral code in the BACKEND; a valid code shows a discount line + reduced total.
  async function applyReferral() {
    const code = referralCode.trim();
    if (!code) { setReferralInfo(null); setReferralMsg(null); return; }
    setReferralChecking(true); setReferralMsg(null);
    try {
      const res = await fetch('/api/referrals/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }), cache: 'no-store',
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d?.valid) {
        const pct = Number(d.discount_pct) || 0;
        setReferralInfo({ discount_pct: pct, code: d.code || code });
        setReferralMsg(pct > 0 ? `Code applied: ${pct}% off` : 'Code applied');
      } else {
        setReferralInfo(null);
        setReferralMsg(referralReason(d?.reason));
      }
    } catch {
      setReferralInfo(null); setReferralMsg('Could not check the code. Please try again.');
    } finally { setReferralChecking(false); }
  }

  // BUG-025: bookings require an account. A guest first sees the account prompt; only
  // "Log in or sign up" opens the normal auth popup (which resumes this booking at the review popup
  // after sign-in via the resume-to-review effect above). "Not now" just closes - no guest booking.
  async function handleConfirm() {
    setShowReview(false);
    if (isLoggedIn) { submitBooking(); return; }
    if (!email.trim()) { setFormError('Email is required.'); return; }
    if (!isValidEmail(email)) { setFormError('Please enter a valid email address.'); return; }
    if (!isLoggedIn && !name.trim()) { setFormError('Please enter your name.'); return; }
    if (!isValidPhone(phone)) { setFormError('Please enter a valid phone number for the selected country.'); return; }
    setFormError(null);
    // A guest cannot book under an email that already belongs to a registered account: a later
    // sign-in with that email would claim the booking, so the guest who paid would lose access.
    // Detect it and route them to log in or change the email instead of booking as a guest.
    setCheckingEmail(true);
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      // Only treat the email as an existing account (and block guest booking) when it's a REAL,
      // usable account: verified, or has a password, or signs in with Google. A dangling
      // half-started signup (row created but never verified, no password) must not block the same
      // person from booking as a guest with that email.
      setEmailExists(!!data?.exists && (!!data?.confirmed || !!data?.has_password || !!data?.oauth_only));
      setEmailOauthOnly(!!data?.oauth_only);
    } catch {
      // Degrade to the normal guest prompt if the check is unreachable - never block a booking on it.
      setEmailExists(false);
      setEmailOauthOnly(false);
    } finally {
      setCheckingEmail(false);
    }
    setShowAccountPrompt(true);
  }

  // Guest chose to log in: open the normal auth popup (no banner) with the email prefilled;
  // the booking resumes on the same page after sign-in, right where they left off.
  function proceedToLogin() {
    setShowAccountPrompt(false);
    // Persist the full checkout state (service, slot, contact fields, "at review") so we resume at the
    // payment-breakdown popup after auth - robust to a same-page login, a signup, or a full OAuth
    // navigation. `next` carries this page so signup/OAuth (which otherwise default to /home) return
    // here; email login already stays on-page. BUG-078.
    saveResumeDraft();
    const back = encodeURIComponent(pathname);
    router.push(`${pathname}?auth=open&email=${encodeURIComponent(email.trim())}&next=${back}`);
  }

  // Existing-account prompt: user chose to change the email. Close the prompt and return to the
  // form so they can edit the address (the field lives on the form step).
  function changeBookingEmail() {
    setShowAccountPrompt(false);
    setEmailExists(false);
    setEmailOauthOnly(false);
    setFormError(null);
  }

  // Flight-style guest checkout: skip the account and go straight to payment. The booking is
  // stored under their email (candidate_id NULL) and claimed if they sign up later with it.
  function proceedAsGuest() {
    setShowAccountPrompt(false);
    submitBooking();
  }

  // Load slots when a service is selected
  async function selectService(svc: Service) {
    setSelectedService(svc);
    saveDraft(svc.id);
    setSlots(null);
    setSlotsError(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSlotsLoading(true);
    setStep('datetime');
    try {
      const today = new Date();
      const maxDate = new Date(today);
      // Request the max window the endpoint allows (60 days). get_available_slots then clamps
      // to each mentor's own booking window (app_booking_window / days_ahead), so a mentor who
      // takes bookings 60 days out shows all of them, not just the first 30.
      maxDate.setDate(today.getDate() + 60);
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
    if (selectedService) saveDraft(selectedService.id, slot.slot_start);
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
    if (!isLoggedIn && !name.trim()) { setFormError('Please enter your name.'); return; }
    if (!isValidPhone(phone)) { setFormError('Please enter a valid phone number for the selected country.'); return; }
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
          referral_code: referralCode.trim() || undefined,
          answers:     questions.map(q => ({ question_id: q.id, answer_text: answers[q.id] ?? '' })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.detail || 'Booking failed. Please try another slot.'); return; }
      setBookingId(data.booking_id);
      clearDraft();
      setStep('confirmed');
    } catch { setFormError('Could not complete the booking. Please try again.'); }
    finally { setSubmitting(false); }
  }

  // Paid path: delegates to the shared quote → reserve → Razorpay → verify flow
  // (lib/checkout), which is also used by the session detail page's "Complete payment".
  // Robust to a dropped webhook: /verify finalizes right after Checkout, and the
  // dispatcher's sweep is the backstop if even that call is lost.
  async function paidBookingFlow() {
    if (!selectedSlot || !selectedService) return;
    setSubmitting(true); setPaying(true);
    const done = () => { setSubmitting(false); setPaying(false); };
    await startPaidCheckout(
      {
        mentorId: mentor.id,
        serviceId: selectedService.id,
        slotTime: selectedSlot.slot_start,
        email: email,
        phone: phone,
        name: name,
        notes: notes,
        serviceTitle: selectedService.title,
        timezone: TZ,
        referralCode: referralCode.trim() || undefined,
        answers: questions
          .map(q => ({ question_id: q.id, answer_text: answers[q.id] ?? '' }))
          .filter(a => a.answer_text),
      },
      {
        onConfirmed: (id) => { setBookingId(id); clearDraft(); setStep('confirmed'); done(); },
        onSlotTaken: (msg) => { setFormError(msg); done(); },
        onError: (msg) => { setFormError(msg); done(); },
        onDismiss: () => { setFormError('Payment cancelled. Your slot is held for 10 minutes if you want to try again.'); done(); },
      },
    );
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
  const mentorLocation   = [mentor.city, mentor.country ? countryLabel(mentor.country) : ''].filter(Boolean).join(', ');
  // Only call it "Fair pricing" when localisation actually LOWERED a price for this visitor. If PPP
  // leaves prices equal or higher, showing a fair-pricing badge next to a higher charge reads as a
  // markup (BUG-051), so the badge is suppressed.
  const hasFairDiscount  = Object.values(priceMap).some(
    (p) => p.discounted < p.original && formatPrice(p.original, p.currency) !== formatPrice(p.discounted, p.currency),
  );

  // ── Confirmed state ──────────────────────────────────────────────────────────
  if (step === 'confirmed') {
    const detailRows: [string, string][] = selectedService && selectedSlot ? [
      ['Session', selectedService.title],
      ['Date', formatDate(slotDateKey(selectedSlot.slot_start))],
      ['Your time', `${formatSlotTime(selectedSlot.slot_start)} · ${tzShort(userTz)}`],
      ...(showMentorTz ? [['Mentor\'s time', `${formatSlotTimeInTz(selectedSlot.slot_start, mentorTz)} · ${tzShort(mentorTz)}`] as [string, string]] : []),
      ['Duration', `${selectedService.duration} min · ${selectedService.type === 'video' ? 'Video call' : 'Direct message'}`],
    ] : [];
    return (
      <div className="flex flex-col gap-6">
        <Link href="/mentors" className="text-sm text-muted hover:text-foreground inline-flex items-center gap-1 w-fit">
          <ChevronLeft className="h-4 w-4" /> All mentors
        </Link>
        <div className="rounded-2xl border border-[--color-border] bg-white px-6 py-10 sm:px-8 max-w-lg mx-auto">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center">
            <Check className="h-7 w-7 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-semibold text-brand-900 mt-4">Your session is confirmed</h2>
          <p className="text-sm text-muted mt-1">
            You&apos;re all set with {mentor.display_name}. A confirmation is on its way to{' '}
            <span className="font-medium text-foreground break-words">{email}</span>.
          </p>
        </div>

        {/* Mentor - clean, no box */}
        <div className="mt-8 flex items-center gap-3">
          {mentor.photo_url ? (
            <img src={mentor.photo_url} alt={mentor.display_name} className="h-14 w-14 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-brand-700 to-accent-500 flex items-center justify-center text-white font-semibold shrink-0">{initials}</div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-brand-900 break-words">{mentor.display_name}</p>
            {mentor.headline && <p className="text-xs text-muted break-words">{mentor.headline}</p>}
            {mentorLocation && (
              <p className="text-xs text-muted mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /> {mentorLocation}</p>
            )}
          </div>
        </div>

        {/* Session details - airy label/value pairs, no boxes */}
        {detailRows.length > 0 && (
          <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            {detailRows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-muted">{k}</dt>
                <dd className="mt-1 text-sm font-semibold text-foreground break-words">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        {/* What happens next - BUG-080: reassure the customer and set expectations. */}
        <div className="mt-8 rounded-2xl border border-[--color-border] bg-brand-50/50 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">What happens next</p>
          {/* Only the two facts the actions below don't already state (no repetition). Reminder timing
              comes from REMINDER_NOTICE so it stays in sync with the actual schedule. */}
          <ul className="mt-2 flex flex-col gap-2 text-sm text-foreground">
            <li className="flex items-start gap-2"><Bell className="h-4 w-4 mt-0.5 shrink-0 text-brand-700" /> We&apos;ll send a reminder {REMINDER_NOTICE} before it starts.</li>
            <li className="flex items-start gap-2"><Video className="h-4 w-4 mt-0.5 shrink-0 text-brand-700" /> Your Join button opens 5 minutes before the start time.</li>
          </ul>
        </div>

        {/* Actions - a guest can't join/manage until they claim the booking with an account. */}
        {isLoggedIn ? (
          <>
            <div className="mt-8 flex flex-col sm:flex-row gap-2">
              {bookingId && (
                <Link href={`/meeting/${bookingId}`} className="flex-1"><Button variant="primary" className="w-full"><Video className="h-4 w-4" /> Join meeting</Button></Link>
              )}
              {bookingId && (
                <Link href={`/session/${bookingId}/reschedule`} className="flex-1"><Button variant="outline" className="w-full">Reschedule</Button></Link>
              )}
            </div>
            <div className="mt-3 text-center">
              <Link href="/account/sessions" className="text-sm text-muted underline hover:text-foreground">View all my sessions</Link>
            </div>
          </>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            <p className="text-sm text-muted text-center leading-relaxed">
              You booked as a guest. Create a free account with{' '}
              <span className="font-medium text-foreground break-words">{email}</span>{' '}
              to join your session and manage it.
            </p>
            <Button variant="accent" className="w-full"
              onClick={() => router.push(`${pathname}?auth=open&email=${encodeURIComponent(email.trim())}`)}>
              Create a free account
            </Button>
          </div>
        )}
        </div>
      </div>
    );
  }

  function changeService() {
    clearDraft();
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSlots(null);
    setStep('service');
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top nav: context-aware, mirrors the "Back to services" button inside the datetime card
          (both call changeService, so they behave identically). On the service step (or after a
          booking is confirmed) it exits to the mentor directory; once the mentor has moved past
          service selection, it stays inside THIS mentor's booking flow instead of dropping them
          all the way out to /mentors and losing the mentor + step context. */}
      {step === 'datetime' || step === 'form' ? (
        <button type="button" onClick={changeService}
          className="text-sm text-muted hover:text-foreground inline-flex items-center gap-1 w-fit">
          <ChevronLeft className="h-4 w-4" /> Back to service
        </button>
      ) : (
        <Link href="/mentors" className="text-sm text-muted hover:text-foreground inline-flex items-center gap-1 w-fit">
          <ChevronLeft className="h-4 w-4" /> All mentors
        </Link>
      )}

      {/* ── Header: identity + rating + timezones ─────────────────── */}
      <div className="rounded-2xl border border-[--color-border] bg-white p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {mentor.photo_url ? (
            <img src={mentor.photo_url} alt={mentor.display_name} className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-br from-brand-700 to-accent-500 flex items-center justify-center text-white text-2xl font-semibold shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {/* Full name + rating on one line; headline + location below. Never truncated. */}
            <div className="flex items-baseline gap-x-3 gap-y-1 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-brand-900 break-words">{mentor.display_name}</h1>
              {typeof mentor.avg_rating === 'number' && mentor.avg_rating > 0 && (
                // BUG-100: the rating jumps straight to where reviews are written, not just displayed.
                <a href="#reviews" className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 shrink-0 hover:underline">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {mentor.avg_rating.toFixed(1)}
                  <span className="text-muted font-normal">({mentor.review_count ?? 0} reviews)</span>
                </a>
              )}
            </div>
            {mentor.headline && <p className="text-sm text-muted mt-1 break-words">{mentor.headline}</p>}
            {mentorLocation && (
              <p className="text-xs text-muted mt-1.5 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" /> {mentorLocation}
              </p>
            )}
          </div>
        </div>

        {/* BUG-100: profile facts (home country, years abroad, domain expertise, destination
            countries, languages) - previously missing entirely from the direct-booking page. */}
        {(mentor.home_country_code || mentor.years_lived_experience
          || (mentor.professional_domains?.length ?? 0) > 0
          || (mentor.expertise_country_codes?.length ?? 0) > 0
          || (mentor.languages?.length ?? 0) > 0) && (
          <div className="mt-4 pt-3 border-t border-[--color-border] flex flex-col gap-2 text-xs text-muted">
            {(mentor.home_country_code || mentor.years_lived_experience) && (
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                {mentor.home_country_code && (
                  <span>From <span className="font-semibold text-foreground">{countryLabel(mentor.home_country_code)}</span></span>
                )}
                {mentor.home_country_code && mentor.years_lived_experience ? <span>·</span> : null}
                {!!mentor.years_lived_experience && (
                  <span>{mentor.years_lived_experience} yr{mentor.years_lived_experience === 1 ? '' : 's'} lived abroad</span>
                )}
              </div>
            )}
            {(mentor.professional_domains?.length ?? 0) > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="shrink-0">Domain expertise</span>
                {mentor.professional_domains!.map((d) => (
                  <span key={d} className="rounded-full bg-neutral-100 text-foreground px-2 py-0.5 font-medium">{d}</span>
                ))}
              </div>
            )}
            {(mentor.expertise_country_codes?.length ?? 0) > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="shrink-0">Guides moves to</span>
                {mentor.expertise_country_codes!.map((c) => (
                  <span key={c} className="rounded-full bg-brand-50 text-brand-700 px-2 py-0.5 font-medium">{countryLabel(c)}</span>
                ))}
              </div>
            )}
            {(mentor.languages?.length ?? 0) > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="shrink-0">Speaks</span>
                {mentor.languages!.map((l) => (
                  <span key={l} className="rounded-full bg-neutral-100 text-foreground px-2 py-0.5 font-medium">{languageLabel(l)}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timezones on their own row so they never squeeze the name/headline on mobile. */}
        <div className="mt-4 pt-3 border-t border-[--color-border] flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted">
          <span>Your time <span className="font-semibold text-foreground">{tzShort(userTz)}</span></span>
          {showMentorTz && <span>Mentor&apos;s time <span className="font-semibold text-foreground">{tzShort(mentorTz)}</span></span>}
          {mentor.smart_pricing && hasFairDiscount && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 font-medium">
              Fair pricing
            </span>
          )}
        </div>

        {/* Bio lives INSIDE the card, aligned with the identity above it (clamped to ~4 lines;
            Read more only when it actually overflows). */}
        {mentor.bio && !isRichTextEmpty(mentor.bio) && (
          <div className="mt-4 pt-4 border-t border-[--color-border]">
            {/* Justify + tighten: migrated bios arrive as many short one-line paragraphs, which
                otherwise read as a choppy, spaced-out list. Tight paragraph margins + hidden empty
                paragraphs make it flow as continuous prose. */}
            <div ref={bioRef} className={cn('text-sm text-foreground leading-relaxed text-justify [&_p]:my-1 [&_p:empty]:hidden transition-all', !bioExpanded && 'line-clamp-4')}>
              <RichText html={mentor.bio} />
            </div>
            {bioOverflows && (
              <button
                type="button"
                onClick={() => setBioExpanded((v) => !v)}
                className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900 transition-colors"
              >
                {bioExpanded ? <>Show less <ChevronUp className="h-4 w-4" /></> : <>Read more <ChevronDown className="h-4 w-4" /></>}
              </button>
            )}
          </div>
        )}
      </div>

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
                          {!isRichTextEmpty(svc.description) && <p className="text-xs text-muted leading-relaxed line-clamp-2">{richTextToPlain(svc.description)}</p>}
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                            <Clock className="h-3 w-3" />{svc.duration} min · {svc.type === 'video' ? 'Video call' : 'Direct message'}
                            {svc.category && <span>· {svc.category}</span>}
                          </div>
                        </div>
                        <PriceLabel service={svc} price={priceMap[svc.id]} priceReady={priceReady} className="shrink-0 text-base font-semibold text-brand-700" />
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
                <button type="button" onClick={changeService}
                  className="inline-flex items-center gap-1 rounded-lg border border-[--color-border] px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:border-brand-400 hover:bg-brand-50 transition-colors shrink-0">
                  <ChevronLeft className="h-3.5 w-3.5" /> Back to services
                </button>
              </div>
              {slotsError ? (
                <p className="text-sm text-red-600">{slotsError}</p>
              ) : slotsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading availability…</div>
              ) : slots && slots.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">No open slots in the mentor&apos;s booking window.<br /><span className="text-xs">Check back later.</span></p>
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
                        <p className="text-xs text-muted mb-3">
                          {timeSlotsForDay.length} open · your time
                          {showMentorTz && <> · mentor&apos;s time in {tzCity(mentorTz)}</>}
                        </p>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
                          {timeSlotsForDay.map(slot => {
                            const sel = selectedSlot?.slot_start === slot.slot_start;
                            return (
                              <button key={slot.slot_start} type="button" onClick={() => selectSlot(slot)}
                                className={cn('flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg border text-center transition-colors',
                                  sel ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-[--color-border] hover:border-brand-500 hover:bg-brand-50')}>
                                <span className="text-sm font-semibold text-foreground">{formatSlotTime(slot.slot_start)}</span>
                                {showMentorTz && (
                                  <span className="text-[11px] leading-tight text-muted">
                                    {formatSlotTimeInTz(slot.slot_start, mentorTz)} for mentor
                                  </span>
                                )}
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
                <Row k="When" v={selectedSlot ? `${formatDate(slotDateKey(selectedSlot.slot_start))}, ${formatSlotTime(selectedSlot.slot_start)}` : 'Not selected yet'} />
                {showMentorTz && <Row k="Mentor's time" v={selectedSlot ? `${formatSlotTimeInTz(selectedSlot.slot_start, mentorTz)} ${tzShort(mentorTz)}` : 'Not selected yet'} />}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Session price</span>
                <PriceLabel service={selectedService} price={priceMap[selectedService.id]} priceReady={priceReady} className="text-lg font-semibold text-brand-900" />
              </div>
              {selectedService.set_price > 0 && (
                <p className="-mt-1.5 text-[11px] text-muted text-right">Platform fee and tax shown at checkout</p>
              )}
              {(() => {
                const p = priceMap[selectedService.id];
                if (!p || p.discounted >= p.original) return null;
                return (
                  <p className="-mt-1.5 text-[11px] font-medium text-amber-700 text-right">
                    Fair-price discount applied
                  </p>
                );
              })()}

              {selectedSlot && (
                <div className="border-t border-[--color-border] pt-3 flex flex-col gap-3">
                  {questions.map(q => (
                    <div key={q.id} className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-foreground">
                        {q.question_text}{q.is_required && <span className="text-foreground ml-0.5">*</span>}
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
                      <Input label="Your name *" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" autoComplete="name" required />
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
                      What should your mentor prepare?
                    </label>
                    <textarea rows={3} maxLength={NOTES_MAX} value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="Share your goal or specific questions so your mentor can prepare."
                      className="px-3 py-2 rounded-lg bg-white text-sm text-foreground resize-none placeholder:text-muted shadow-[0_0_0_1px_rgba(15,23,42,0.06)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]" />
                  </div>

                  {formError && <p className="text-sm text-red-600">{formError}</p>}
                  <Button variant="accent" onClick={openReview} loading={submitting || paying || checkingEmail} disabled={!email.trim() || !isValidEmail(email) || !isValidPhone(phone) || (!isLoggedIn && !name.trim())}>
                    Review &amp; confirm
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

      {showReview && selectedService && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 p-5 border-b border-[--color-border]">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Review &amp; payment</p>
                <h3 className="text-base font-semibold text-brand-900 break-words">{selectedService.title}</h3>
                <p className="text-xs text-muted mt-1">
                  {formatDate(slotDateKey(selectedSlot.slot_start))} · {formatSlotTime(selectedSlot.slot_start)} · {selectedService.duration} min
                </p>
              </div>
              <button type="button" onClick={() => setShowReview(false)} aria-label="Close" className="text-muted hover:text-foreground shrink-0 text-lg leading-none">✕</button>
            </div>

            {/* Referral code: validated in the backend; a valid code applies its discount below. */}
            <div className="p-5 border-b border-[--color-border] flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Referral code</label>
              <div className="flex gap-2">
                <input value={referralCode}
                  onChange={(e) => { setReferralCode(e.target.value); setReferralInfo(null); setReferralMsg(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyReferral(); } }}
                  placeholder="Enter code"
                  className="flex-1 h-10 px-3 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]" />
                <Button variant="outline" className="shrink-0" onClick={applyReferral}
                  loading={referralChecking} disabled={!referralCode.trim()}>Apply</Button>
              </div>
              {referralMsg && <p className={`text-xs ${referralInfo ? 'text-green-600' : 'text-red-600'}`}>{referralMsg}</p>}
            </div>

            {/* Price breakdown - all amounts come straight from the backend quote */}
            <div className="p-5 flex flex-col gap-2">
              {selectedService.set_price === 0 ? (
                <Row k="Total" v="Free" />
              ) : reviewLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Calculating price…</div>
              ) : reviewQuote ? (
                <>
                  <Row k="Session price" v={formatPrice(reviewQuote.mentor_amount, reviewQuote.customer_currency)} />
                  {reviewQuote.platform_fee > 0 && (
                    <Row k={`Platform fee${reviewQuote.platform_fee_pct ? ` (${reviewQuote.platform_fee_pct}%)` : ''}`} v={formatPrice(reviewQuote.platform_fee, reviewQuote.customer_currency)} />
                  )}
                  {reviewQuote.tax_amount > 0 && (
                    <Row k={`Tax${reviewQuote.tax_pct ? ` (${reviewQuote.tax_pct}%)` : ''}`} v={formatPrice(reviewQuote.tax_amount, reviewQuote.customer_currency)} />
                  )}
                  {referralInfo && referralInfo.discount_pct > 0 && (
                    <div className="flex items-center justify-between text-green-700">
                      <span className="text-sm">Referral discount ({referralInfo.discount_pct}%)</span>
                      <span className="text-sm">- {formatPrice(reviewQuote.gross_customer * referralInfo.discount_pct / 100, reviewQuote.customer_currency)}</span>
                    </div>
                  )}
                  <div className="mt-1 pt-2 border-t border-[--color-border] flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Total to pay</span>
                    <span className="text-base font-bold text-brand-900">{formatPrice(reviewQuote.gross_customer * (1 - (referralInfo?.discount_pct || 0) / 100), reviewQuote.customer_currency)}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Total to pay</span>
                  <PriceLabel service={selectedService} price={priceMap[selectedService.id]} priceReady={priceReady} className="text-base font-bold text-brand-900" />
                </div>
              )}
              {formError && <p className="text-sm text-red-600 mt-1">{formError}</p>}
            </div>

            {/* Actions: confirm, or go back to change the slot */}
            <div className="p-5 border-t border-[--color-border] flex flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowReview(false); setStep('datetime'); }}>Modify booking</Button>
              <Button variant="accent" className="flex-1" loading={submitting || paying || checkingEmail} onClick={handleConfirm}>
                {paymentsEnabled && selectedService.set_price > 0 ? 'Pay & confirm' : 'Confirm booking'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAccountPrompt && (
        <BookingAccountPrompt
          onProceed={proceedToLogin}
          onGuest={proceedAsGuest}
          onDismiss={() => { setShowAccountPrompt(false); setEmailExists(false); setEmailOauthOnly(false); }}
          onChangeEmail={changeBookingEmail}
          email={email.trim()}
          existingAccount={emailExists}
          oauthOnly={emailOauthOnly}
        />
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
