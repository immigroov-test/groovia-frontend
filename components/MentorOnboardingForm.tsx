'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../lib/supabase/client';
import { Card, CardBody } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { MultiSelect } from './ui/MultiSelect';
import { PhoneInput } from './ui/PhoneInput';
import { PhotoUpload } from './ui/PhotoUpload';
import { SocialLinks, type SocialLink } from './ui/SocialLinks';
import { CountrySelect } from './ui/CountrySelect';
import { TimezoneSelect } from './ui/TimezoneSelect';
import { RichTextEditor } from './ui/RichTextEditor';
import { Flag } from './ui/Flag';
import { Toggle } from './ui/Toggle';
import { WeeklyHoursEditor, WEEK_DAYS, emptyWeek, validateWeeklyHours, weeklyToSlots, type WeeklyHours } from './WeeklyHoursEditor';
import { ServiceListEditor, activeServiceCount, type DraftService } from './ServiceListEditor';
import { DateOverridesEditor, type DateOverride } from './DateOverridesEditor';
import { isRichTextEmpty } from '../lib/sanitizeHtml';
import { COUNTRIES } from '../lib/countries';
import { LANGUAGES } from '../lib/languages';
import { COUNTRY_TIMEZONES } from '../lib/countryTimezones';
import { cn } from '../lib/utils';

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.name, icon: <Flag code={c.code} /> }));
const LANGUAGE_OPTIONS = LANGUAGES.map((l) => ({ value: l.code, label: l.name }));

const DOMAIN_OPTIONS = [
  'Software Engineering', 'Product Management', 'Data Science & AI', 'Design (UX/UI)',
  'Marketing', 'Sales', 'Finance & Banking', 'Healthcare', 'Legal', 'Education',
  'Entrepreneurship', 'Operations', 'HR & Recruiting', 'Consulting', 'Research',
  'Manufacturing', 'Real Estate', 'Media & Journalism', 'Government & Policy', 'Non-profit',
].map((d) => ({ value: d, label: d }));

const BIO_MAX = 2000;
const NOTES_MAX = 800;

const STEPS = [
  { n: 1, label: 'Your details' },
  { n: 2, label: 'Availability & sessions' },
  { n: 3, label: 'Submit for approval' },
] as const;

// Prefilled into Public Notes; the mentor can edit or remove it.
const DEFAULT_DISCLAIMER =
  'All the information provided during the call is done in good faith and for general information purposes only. ' +
  'I am not involved in any application processing for visas, jobs, or university admissions. ' +
  'For any specific advice or legal support, please consult a qualified expert.';

interface Props {
  defaultName?: string;
  userId?: string;
}

export function MentorOnboardingForm({ defaultName = '', userId }: Props) {
  const router = useRouter();

  // Step 1 - details
  const [displayName, setDisplayName] = useState(defaultName);
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [languages, setLanguages] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [publicNotes, setPublicNotes] = useState(DEFAULT_DISCLAIMER);
  const [expertiseCountries, setExpertiseCountries] = useState<string[]>([]);
  const [yearsExp, setYearsExp] = useState('');
  const [domains, setDomains] = useState<string[]>([]);

  // Step 2 - availability + sessions
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>(emptyWeek());
  const [services, setServices] = useState<DraftService[]>([]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [smartPricing, setSmartPricing] = useState(false);
  const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'NZD', 'SGD', 'AED', 'CHF'];
  const [daysAhead, setDaysAhead] = useState(30);
  const [minNotice, setMinNotice] = useState(2);
  const [cancelHours, setCancelHours] = useState(24);
  const [overrides, setOverrides] = useState<DateOverride[]>([]);
  const [agreedMentor, setAgreedMentor] = useState(false);

  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Jump to the top whenever the step changes. Runs after the DOM swaps step content,
  // so it lands on the new step's top (a synchronous scroll during the click handler
  // fires before layout updates and can leave you at the old, now-shorter bottom).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  function onCountryChange(code: string) {
    setCountry(code);
    const tz = COUNTRY_TIMEZONES[code];
    if (tz) setTimezone(tz);
  }

  function validateDetails(): string | null {
    if (!displayName.trim()) return 'Display name is required.';
    if (!professionalTitle.trim()) return 'Headline is required.';
    if (!country) return 'Please select your current country.';
    if (languages.length === 0) return 'Select at least one language.';
    if (expertiseCountries.length === 0) return 'Select at least one country of expertise.';
    if (expertiseCountries.length > 2) return 'You can select a maximum of 2 countries of expertise.';
    const years = parseInt(yearsExp, 10);
    if (!yearsExp || isNaN(years) || years < 0) return 'Enter your years of lived experience.';
    return null;
  }

  const availError = validateWeeklyHours(weeklyHours);
  const sessionError = activeServiceCount(services) < 1 ? 'Add and activate at least one session type.' : null;
  const rulesError = (() => {
    if (!(daysAhead >= 1 && daysAhead <= 365)) return 'Set how many days ahead mentees can book (1-365).';
    if (!(minNotice >= 0 && minNotice <= 168)) return 'Set a valid minimum booking notice (0-168 hours).';
    if (!(cancelHours >= 1 && cancelHours <= 168)) return 'Set a valid cancellation notice (1-168 hours).';
    return null;
  })();
  const activeWeekdays = new Set(WEEK_DAYS.filter((d) => (weeklyHours[d]?.length ?? 0) > 0));
  const canSubmit = !availError && !sessionError && !rulesError && agreedMentor;

  function goToStep2() {
    const err = validateDetails();
    if (err) { setError(err); return; }
    setError(null);
    setStep(2);
  }
  function backToStep1() {
    setError(null);
    setStep(1);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const detailErr = validateDetails();
    if (detailErr) { setError(detailErr); setStep(1); return; }
    if (availError) { setError(availError); return; }
    if (sessionError) { setError(sessionError); return; }
    if (rulesError) { setError(rulesError); return; }
    if (!agreedMentor) { setError('Please accept the Mentor Agreement to proceed.'); return; }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setError('Session expired. Please log in again.'); return; }

      const res = await fetch('/api/mentor/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          display_name: displayName.trim(),
          headline: professionalTitle.trim() || undefined,
          photo_url: photoUrl || undefined,
          phone: phone || undefined,
          bio: isRichTextEmpty(bio) ? undefined : bio,
          country,
          city: city.trim() || undefined,
          timezone,
          languages,
          social_links: socialLinks,
          public_notes: publicNotes.trim() || undefined,
          expertise_country_codes: expertiseCountries,
          years_lived_experience: parseInt(yearsExp, 10),
          professional_domains: domains,
          agreed_to_mentor_terms: true,
          hourly_rate: parseFloat(hourlyRate) || null,
          currency,
          smart_pricing: smartPricing,
          weekly_availability: weeklyToSlots(weeklyHours),
          services: services.map((s) => ({ title: s.title, duration: s.duration, is_active: s.active, set_price: s.price })),
          booking_rules: { days_ahead: daysAhead, min_notice_hours: minNotice, cancel_hours: cancelHours },
          date_overrides: overrides,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Something went wrong. Please try again.'); return; }
      if (!data.id) { setError('Unexpected response from server. Please try again.'); return; }
      router.push('/mentor');
      router.refresh();
    } catch {
      setError('Could not create your mentor profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">

      {/* Step-aware page heading */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900">
          {step === 1 ? 'Create your mentor profile' : 'Provide availability & sessions'}
        </h1>
        <p className="text-sm text-muted mt-1">
          {step === 1
            ? 'Complete the form below and our team will review your application, usually within 1-2 business days.'
            : 'Set when you are available and the sessions mentees can book. You can change these anytime.'}
        </p>
      </div>

      {/* Step indicator: details -> availability & sessions -> submit for approval */}
      <div className="flex items-center gap-3 flex-wrap">
        {STEPS.map(({ n, label }, i) => (
          <div key={n} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                step >= n ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-600')}>{n}</span>
              <span className={cn('text-sm', step === n ? 'font-semibold text-foreground' : 'text-muted')}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={cn('h-px w-8', step > n ? 'bg-brand-500' : 'bg-[--color-border]')} />}
          </div>
        ))}
      </div>

      {/* ══ STEP 1: DETAILS ═══════════════════════════════════════════ */}
      <div className={cn('flex-col gap-6', step === 1 ? 'flex' : 'hidden')}>
        <Card>
          <CardBody className="pt-6 flex flex-col gap-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Profile settings</h2>
              <p className="text-sm text-muted mt-0.5">Basic info, expertise, languages</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline gap-2">
                <label className="text-sm font-medium text-foreground">Profile Photo</label>
                <span className="text-xs text-muted">(Recommended)</span>
              </div>
              <PhotoUpload value={photoUrl} onChange={setPhotoUrl} userId={userId} />
            </div>

            <Input label="Full name *" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Priya Nair" autoComplete="name" required />

            <Input label="Headline *" value={professionalTitle} onChange={(e) => setProfessionalTitle(e.target.value)}
              placeholder="e.g. Supply Chain Professional, Software Engineer, AI Developer, Career Expert" required />

            <PhoneInput label="Phone Number" value={phone} onChange={setPhone} required
              hint="Used for session coordination. Not shown to users." />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="pt-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-foreground">About You *</h2>
            <RichTextEditor value={bio} onChange={setBio} maxChars={BIO_MAX}
              placeholder="Introduce yourself: your experience, skills, and approach towards clients. Use the toolbar for bullet points or emphasis." />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="pt-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-foreground">Location & Languages</h2>

            <CountrySelect label="Country" value={country} onChange={onCountryChange} required
              placeholder="Select your current country" hint="Country you currently live in." />

            <Input label="City" value={city} onChange={(e) => setCity(e.target.value)}
              placeholder={country ? 'e.g. Amsterdam' : 'Select a country first'} disabled={!country}
              autoComplete="address-level2" hint="Optional, shown on your public profile." />

            <MultiSelect label="Languages Spoken *" options={LANGUAGE_OPTIONS} value={languages} onChange={setLanguages}
              placeholder={'Type to search (e.g. "Ja" for Japanese)'} hint="Type and press Enter, or click to add." />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="pt-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Social Links</h2>
              <p className="text-sm text-muted mt-0.5">Add links to your public profiles. Helps mentees learn more about you.</p>
            </div>
            <SocialLinks value={socialLinks} onChange={setSocialLinks} hint="Optional, up to one link per platform." />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="pt-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Expertise</h2>
              <p className="text-sm text-muted mt-0.5">These fields determine which mentees you can best serve. Changes here will require re-approval by our team.</p>
            </div>

            <MultiSelect label="Countries of Expertise * (max 2)" options={COUNTRY_OPTIONS} value={expertiseCountries}
              onChange={setExpertiseCountries} placeholder="Type to search, press Enter to add" maxSelected={2}
              hint="Countries you have direct immigration or career experience in." />

            <Input label="Years of Lived Experience *" type="number" min={0} max={60} value={yearsExp}
              onChange={(e) => setYearsExp(e.target.value)} placeholder="e.g. 5"
              hint="Total years you have lived or worked abroad as an immigrant." />

            <MultiSelect label="Domains of Expertise" options={DOMAIN_OPTIONS} value={domains} onChange={setDomains}
              placeholder="Type to search, press Enter to add" hint="Industries or roles you can advise on." />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="pt-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-foreground">Public Notes</h2>
            <div className="flex flex-col gap-1.5">
              <textarea rows={4} value={publicNotes}
                onChange={(e) => setPublicNotes(e.target.value.slice(0, NOTES_MAX))}
                placeholder="Anything clients should know before booking (visible on your profile)."
                className={cn('px-3 py-2 rounded-lg bg-white text-sm text-foreground resize-y placeholder:text-muted',
                  'shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]',
                  'focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]')} />
              <p className="text-xs text-muted">A standard disclaimer is prefilled. Edit or replace it as you like.</p>
              <p className={cn('text-xs text-right', publicNotes.length >= NOTES_MAX ? 'text-red-500' : 'text-muted')}>{publicNotes.length}/{NOTES_MAX}</p>
            </div>
          </CardBody>
        </Card>

        {error && step === 1 && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <Button type="button" variant="accent" onClick={goToStep2}>Continue to availability →</Button>
        </div>
      </div>

      {/* ══ STEP 2: AVAILABILITY + SESSIONS ═══════════════════════════ */}
      <div className={cn('flex-col gap-6', step === 2 ? 'flex' : 'hidden')}>
        <Card>
          <CardBody className="pt-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Timezone</h2>
              <p className="text-sm text-muted mt-0.5">Your hours below are interpreted in this timezone.</p>
            </div>
            <TimezoneSelect value={timezone} onChange={setTimezone} />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="pt-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Weekly availability *</h2>
              <p className="text-sm text-muted mt-0.5">Turn on the days you work and add one or more time slots. Slots on a day can&apos;t overlap.</p>
            </div>
            <WeeklyHoursEditor value={weeklyHours} onChange={setWeeklyHours} />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="pt-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Pricing &amp; session types *</h2>
              <p className="text-sm text-muted mt-0.5">Add the sessions mentees can book (one per length: 15, 30, 45, 60 min). At least one must be active.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Hourly rate</label>
                <input type="number" min={0} step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="e.g. 60"
                  className="h-10 px-3 rounded-lg bg-white text-sm border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                  className="h-10 px-3 rounded-lg bg-white text-sm border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300">
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-muted">
              Immigroov prorates your hourly rate by each session&apos;s length (a 30-min session is half your hourly rate). Each price is prefilled from it and you can fine-tune any session below.
            </p>
            <label className="flex items-start justify-between gap-3 rounded-lg border border-[--color-border] p-3 cursor-pointer">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Smart pricing</p>
                <p className="text-xs text-muted mt-0.5">Let Immigroov adapt your price to each customer&apos;s country (purchasing-power parity) so it feels fair to them. This usually lifts your booking rate.</p>
              </div>
              <Toggle checked={smartPricing} onChange={setSmartPricing} aria-label="Smart pricing" />
            </label>
            <ServiceListEditor value={services} onChange={setServices} hourlyRate={parseFloat(hourlyRate) || undefined} currency={currency} />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="pt-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Booking rules *</h2>
              <p className="text-sm text-muted mt-0.5">
                How far ahead mentees can book, the minimum warning you need before a session, and how late
                a session can be cancelled. Example: a minimum notice of 2 means the soonest bookable slot is
                2 hours from now.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Book up to (days ahead)</span>
                <input type="number" min={1} max={365} value={daysAhead}
                  onChange={(e) => setDaysAhead(parseInt(e.target.value) || 0)}
                  className="h-11 w-40 px-3 rounded-xl bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Minimum booking notice (hrs)</span>
                <input type="number" min={0} max={168} step={0.5} value={minNotice}
                  onChange={(e) => setMinNotice(parseFloat(e.target.value) || 0)}
                  className="h-11 w-44 px-3 rounded-xl bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Cancellation notice (hrs)</span>
                <input type="number" min={1} max={168} value={cancelHours}
                  onChange={(e) => setCancelHours(parseInt(e.target.value) || 0)}
                  className="h-11 w-40 px-3 rounded-xl bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]" />
              </label>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="pt-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Date overrides</h2>
              <p className="text-sm text-muted mt-0.5">
                Optional. Block specific dates (holidays) or set different hours for a day. You can also do
                this anytime from your hub.
              </p>
            </div>
            <DateOverridesEditor value={overrides} onChange={setOverrides} activeWeekdays={activeWeekdays} />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="pt-6 flex flex-col gap-4">
            <label className="text-sm text-muted flex items-start gap-2 select-none cursor-pointer">
              <input type="checkbox" className="mt-0.5 accent-[--color-brand-500]" checked={agreedMentor}
                onChange={(e) => setAgreedMentor(e.target.checked)} />
              <span>
                I agree to the{' '}
                <Link href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Terms of Service</Link>{' '}
                and{' '}
                <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Privacy Policy</Link>.
              </span>
            </label>

            {/* What's left before they can submit */}
            {!canSubmit && (
              <ul className="text-xs text-muted flex flex-col gap-1">
                {availError && <li>· {availError}</li>}
                {sessionError && <li>· {sessionError}</li>}
                {rulesError && <li>· {rulesError}</li>}
                {!agreedMentor && <li>· Accept the Mentor Agreement.</li>}
              </ul>
            )}
            {error && step === 2 && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="ghost" onClick={backToStep1} disabled={submitting}>← Back</Button>
              <Button type="submit" variant="accent" loading={submitting} disabled={!canSubmit}>Submit for approval</Button>
            </div>
            <p className="text-xs text-muted">Our team reviews applications within 1-2 business days.</p>
          </CardBody>
        </Card>
      </div>
    </form>
  );
}
