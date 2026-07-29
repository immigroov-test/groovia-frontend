'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../lib/supabase/client';
import { Card, CardBody } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { MultiSelect } from './ui/MultiSelect';
import { TagInput } from './ui/TagInput';
import { PhoneInput } from './ui/PhoneInput';
import { PhotoUpload } from './ui/PhotoUpload';
import { SocialLinks, type SocialLink } from './ui/SocialLinks';
import { CountrySelect } from './ui/CountrySelect';
import { TimezoneSelect } from './ui/TimezoneSelect';
import { RichTextEditor } from './ui/RichTextEditor';
import { Flag } from './ui/Flag';
import { WeeklyHoursEditor, WEEK_DAYS, emptyWeek, validateWeeklyHours, weeklyToSlots, type WeeklyHours } from './WeeklyHoursEditor';
import { activeServiceCount, proratePrice, type DraftService } from './ServiceListEditor';
import { ServiceCatalog } from './ServiceCatalog';
import { CurrencyRatesEditor } from './CurrencyRatesEditor';
import { deriveCurrencyPrices, type CurrencyRate } from '../lib/pricing';
import { DateOverridesEditor, type DateOverride } from './DateOverridesEditor';
import { BankDetailsFields } from './BankDetailsFields';
import { emptyBank, validateBank, toBankPayload, type BankValue } from '../lib/bank';
import { validateCityName } from '../lib/validators';
import { isRichTextEmpty } from '../lib/sanitizeHtml';
import { COUNTRIES } from '../lib/countries';
import { LANGUAGES } from '../lib/languages';
import { COUNTRY_TIMEZONES } from '../lib/countryTimezones';
import { suggestHeadline } from '../lib/headline';
import { suggestTags } from '../lib/tags';
import { cn } from '../lib/utils';

const LANGUAGE_OPTIONS = LANGUAGES.map((l) => ({ value: l.code, label: l.name }));

const DOMAIN_OPTIONS = [
  // Tech & data
  'Software Engineering', 'Web Development', 'Mobile Development', 'DevOps & Cloud', 'Cybersecurity',
  'Data Science & AI', 'Machine Learning', 'Data Engineering', 'Data Analytics', 'Blockchain & Web3',
  'QA & Testing', 'IT Support & Systems', 'Game Development', 'Embedded & Hardware',
  // Product, design & marketing
  'Product Management', 'Project & Program Management', 'Design (UX/UI)', 'Graphic Design',
  'Marketing', 'Digital Marketing', 'Content & Copywriting', 'SEO & Growth', 'Social Media',
  'Sales', 'Business Development', 'Customer Success',
  // Business, finance & ops
  'Finance & Banking', 'Accounting & Audit', 'Investment & Trading', 'Financial Planning',
  'Consulting', 'Strategy', 'Operations', 'Supply Chain & Logistics', 'Procurement',
  'HR & Recruiting', 'Entrepreneurship', 'Startups', 'E-commerce', 'Real Estate',
  // Science, health & engineering
  'Healthcare', 'Nursing', 'Pharmacy', 'Biotechnology', 'Public Health', 'Mental Health & Therapy',
  'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Chemical Engineering',
  'Manufacturing', 'Automotive', 'Energy & Utilities', 'Architecture', 'Research',
  // People, public & creative
  'Education & Teaching', 'Academia & PhD', 'Law & Legal', 'Immigration Law',
  'Government & Policy', 'Non-profit & NGO', 'Media & Journalism', 'Film & Video',
  'Music & Audio', 'Writing & Publishing', 'Hospitality & Tourism', 'Aviation',
  'Fashion & Beauty', 'Sports & Fitness', 'Agriculture', 'Skilled Trades',
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
  const [headlineEdited, setHeadlineEdited] = useState(false);   // true once the mentor types their own headline
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [homeCountry, setHomeCountry] = useState('');
  const [city, setCity] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [languages, setLanguages] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [publicNotes, setPublicNotes] = useState(DEFAULT_DISCLAIMER);
  const categories: string[] = [];   // expertise categories are now derived from configured services, not asked here
  const [yearsExp, setYearsExp] = useState('');           // years lived abroad (optional)
  const [yearsProfExp, setYearsProfExp] = useState('');   // years of professional experience (required)
  const [domains, setDomains] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);   // free-text specifics under domains

  // Step 2 - availability + sessions
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>(emptyWeek());
  const [services, setServices] = useState<DraftService[]>([]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([]);
  const [smartPricing, setSmartPricing] = useState(false);
  const [daysAhead, setDaysAhead] = useState(30);
  const [minNotice, setMinNotice] = useState(2);
  const [cancelHours, setCancelHours] = useState(24);
  const [overrides, setOverrides] = useState<DateOverride[]>([]);
  const [agreedMentor, setAgreedMentor] = useState(false);
  const [bank, setBank] = useState<BankValue>(emptyBank());   // payout details (optional at signup)

  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);   // validation summary (all issues)
  const [submitting, setSubmitting] = useState(false);
  const [saveWarnings, setSaveWarnings] = useState<string[] | null>(null);

  // Jump to the top whenever the step changes. Runs after the DOM swaps step content,
  // so it lands on the new step's top (a synchronous scroll during the click handler
  // fires before layout updates and can leave you at the old, now-shorter bottom).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  // Take the mentor straight to the validation summary whenever new errors appear on submit.
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (formErrors.length > 0) errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [formErrors]);

  // Countries a mentee can browse this mentor by = the two countries they actually know:
  // their home (origin) and current (destination). Derived, not asked for separately.
  const expertiseCountries = Array.from(
    new Set([country, homeCountry].map((c) => (c || '').toUpperCase()).filter(Boolean)),
  );

  // The headline is auto-drafted from the mentor's own answers (no LLM): derived during render
  // so it tracks Domains / Areas of Expertise / country live, until the mentor types their own
  // (headlineEdited), after which their text wins. "Suggest" clears the flag to re-derive.
  const effectiveHeadline = headlineEdited
    ? professionalTitle
    : suggestHeadline({ domain: domains[0], category: categories[0], country });

  function onCountryChange(code: string) {
    setCountry(code);
    // Default the payout country to the mentor's country until they pick a different one.
    setBank((b) => (b.country_code ? b : { ...b, country_code: code }));
    const tz = COUNTRY_TIMEZONES[code];
    if (tz) setTimezone(tz);
  }

  // All missing/invalid Step-1 (details) fields at once, so the summary can list them
  // together instead of surfacing one at a time.
  function collectDetailErrors(): string[] {
    const e: string[] = [];
    if (!displayName.trim()) e.push('Display name is required.');
    if (!effectiveHeadline.trim()) e.push('Headline is required.');
    if (!homeCountry) e.push('Please select your home country.');
    if (!country) e.push('Please select your current country.');
    if (languages.length === 0) e.push('Select at least one language.');
    const profYears = parseInt(yearsProfExp, 10);
    if (!yearsProfExp || isNaN(profYears) || profYears < 0 || profYears > 60) e.push('Enter your years of professional experience (0-60).');
    if (yearsExp) { const y = parseInt(yearsExp, 10); if (isNaN(y) || y < 0 || y > 60) e.push('Years lived abroad must be between 0 and 60.'); }
    const cityErr = validateCityName(city);
    if (cityErr) e.push(cityErr);
    return e;
  }

  const availError = validateWeeklyHours(weeklyHours);
  const sessionError = activeServiceCount(services) < 1
    ? 'Turn on at least one service.'
    : services.some((s) => !s.title.trim()) ? 'Give every service a title, or remove it.' : null;
  const rulesError = (() => {
    if (!(daysAhead >= 1 && daysAhead <= 90)) return 'Set how many days ahead mentees can book (1-90).';
    if (!(minNotice >= 0 && minNotice <= 24)) return 'Set a valid minimum booking notice (0-24 hours).';
    if (!(cancelHours >= 2 && cancelHours <= 48)) return 'Set a valid cancellation/rescheduling notice (2-48 hours).';
    return null;
  })();
  const activeWeekdays = new Set(WEEK_DAYS.filter((d) => (weeklyHours[d]?.length ?? 0) > 0));
  const bankError = validateBank(bank).length > 0 ? 'Add your payout bank details.' : null;
  const canSubmit = !availError && !sessionError && !rulesError && !bankError && agreedMentor;

  // Every missing/invalid field across both steps, for the submit-time summary.
  function collectAllErrors(): string[] {
    const e = collectDetailErrors();
    if (availError) e.push(availError);
    if (sessionError) e.push(sessionError);
    if (rulesError) e.push(rulesError);
    e.push(...validateBank(bank));   // payout details are required
    if (!agreedMentor) e.push('Accept the Mentor Agreement to proceed.');
    return e;
  }

  function goToStep2() {
    const errs = collectDetailErrors();
    if (errs.length) { setFormErrors(errs); setError(null); return; }   // the effect scrolls to the summary
    setFormErrors([]);
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

    const detailErrs = collectDetailErrors();
    const allErrs = collectAllErrors();
    if (allErrs.length) {
      if (detailErrs.length) setStep(1);   // land on the step whose fields need fixing
      setFormErrors(allErrs);              // the effect scrolls the summary into view
      return;
    }
    setFormErrors([]);

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
          headline: effectiveHeadline.trim() || undefined,
          photo_url: photoUrl || undefined,
          phone: phone || undefined,
          bio: isRichTextEmpty(bio) ? undefined : bio,
          country,
          home_country_code: homeCountry || undefined,
          city: city.trim() || undefined,
          timezone,
          languages,
          social_links: socialLinks,
          public_notes: publicNotes.trim() || undefined,
          expertise_country_codes: expertiseCountries,
          expertise_categories: categories,
          years_lived_experience: yearsExp ? parseInt(yearsExp, 10) : null,
          years_professional_experience: parseInt(yearsProfExp, 10),
          professional_domains: domains,
          specializations,
          agreed_to_mentor_terms: true,
          hourly_rate: parseFloat(hourlyRate) || null,
          currency,
          currency_rates: currencyRates,
          smart_pricing: smartPricing,
          weekly_availability: weeklyToSlots(weeklyHours),
          services: services.map((s) => ({
            title: s.title, duration: s.duration, is_active: s.active,
            set_price: s.free ? 0 : proratePrice(parseFloat(hourlyRate) || 0, s.duration),
            currency_prices: s.free ? [] : deriveCurrencyPrices(currencyRates, s.duration),
            description: isRichTextEmpty(s.description) ? null : s.description,
            category: s.category || null, tags: s.tags,
          })),
          booking_rules: { days_ahead: daysAhead, min_notice_hours: minNotice, cancel_hours: cancelHours },
          date_overrides: overrides,
          bank: toBankPayload(bank) ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Surface the real reason (backend detail, or the BFF's error, or the status) so a failure
        // is never silent.
        const reason = data.detail || data.error || `Request failed (HTTP ${res.status}).`;
        console.error('Mentor signup failed:', res.status, data);
        setError(reason);
        return;
      }
      if (!data.id) { setError('Unexpected response from server. Please try again.'); return; }
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        // BUG-012: some items failed to save during signup. Don't silently redirect
        // as if everything succeeded - show what needs to be re-added.
        setSaveWarnings(data.warnings);
        return;
      }
      router.push('/mentor');
      router.refresh();
    } catch (err) {
      console.error('Mentor signup error:', err);
      setError(`Could not create your mentor profile: ${err instanceof Error ? err.message : 'network error'}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  }

  if (saveWarnings) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-900">Profile submitted</h1>
          <p className="text-sm text-muted mt-1">
            Your application was received, but a few items didn&apos;t save. You can re-add them from your dashboard.
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-2">
          {saveWarnings.map((w, i) => (
            <p key={i} className="text-sm text-amber-900">{w}</p>
          ))}
        </div>
        <div>
          <Button type="button" onClick={() => { router.push('/mentor'); router.refresh(); }}>
            Go to dashboard
          </Button>
        </div>
      </div>
    );
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

      {/* Validation summary - lists every missing/invalid field on a submit attempt. */}
      {formErrors.length > 0 && (
        <div ref={errorSummaryRef} role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">
            Please fix {formErrors.length === 1 ? 'the following' : `these ${formErrors.length} items`} before submitting:
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-red-700">
            {formErrors.map((msg, i) => <li key={i}>{msg}</li>)}
          </ul>
        </div>
      )}

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CountrySelect label="Current country *" value={country} onChange={onCountryChange} required
                placeholder="Where you live now" hint="Country you currently live in." />
              <CountrySelect label="Home country *" value={homeCountry} onChange={setHomeCountry} required
                placeholder="Where you're originally from" hint="Shown to mentees as where you're from." />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Years of professional experience *" type="number" min={0} max={60} value={yearsProfExp}
                onChange={(e) => setYearsProfExp(e.target.value)} placeholder="e.g. 8"
                hint="Total years in your profession." />
              <Input label="Years lived abroad" type="number" min={0} max={60} value={yearsExp}
                onChange={(e) => setYearsExp(e.target.value)} placeholder="e.g. 5"
                hint="Optional. Leave blank if you're a local." />
            </div>

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
              <p className="text-sm text-muted mt-0.5">Used to match you with the right mentees. Changes need re-approval.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Countries you can be found under</label>
              {expertiseCountries.length ? (
                <div className="flex flex-wrap gap-2">
                  {expertiseCountries.map((code) => (
                    <span key={code} className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-sm text-foreground">
                      <Flag code={code} /> {COUNTRIES.find((c) => c.code === code)?.name || code}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">Set your home and current country above.</p>
              )}
            </div>

            <MultiSelect label="Domains of Expertise" options={DOMAIN_OPTIONS} value={domains} onChange={setDomains}
              placeholder="Type to search, press Enter to add" hint="Industries or roles you can advise on." />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Specializations <span className="text-muted font-normal">(optional)</span>
              </label>
              <TagInput value={specializations} onChange={setSpecializations} max={12}
                placeholder="e.g. ML in production, computer vision, model deployment" />
              {(() => {
                // Auto-suggested tags from what they've already entered (domains + countries). One tap
                // adds one; they stay fully editable. These feed the mentor-listing search.
                const suggestions = suggestTags({ domains, country, homeCountry })
                  .filter((t) => !specializations.some((s) => s.toLowerCase() === t.toLowerCase()));
                if (suggestions.length === 0 || specializations.length >= 12) return null;
                return (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted">Suggested:</span>
                    {suggestions.slice(0, 8).map((t) => (
                      <button key={t} type="button"
                        onClick={() => setSpecializations([...specializations, t].slice(0, 12))}
                        className="rounded-full border border-dashed border-[--color-border] bg-white px-2.5 py-1 text-xs text-brand-700 hover:border-brand-500 hover:bg-brand-50 transition-colors">
                        + {t}
                      </button>
                    ))}
                  </div>
                );
              })()}
              <p className="text-xs text-muted">Add the specific things you go deep on. The more specific, the easier it is for mentees to find you.</p>
            </div>
          </CardBody>
        </Card>

        {/* Headline: auto-drafted from the expertise above; placed last so every input feeds it. */}
        <Card>
          <CardBody className="pt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-foreground">Headline *</label>
                <button type="button" onClick={() => { setHeadlineEdited(false); setProfessionalTitle(''); }}
                  className="text-xs font-medium text-primary hover:underline">
                  Suggest from my expertise
                </button>
              </div>
              <Input value={effectiveHeadline}
                onChange={(e) => { setHeadlineEdited(true); setProfessionalTitle(e.target.value); }}
                placeholder="e.g. Software Engineering mentor | Helping you land jobs in the Netherlands" required />
              <p className="text-xs text-muted">Auto-drafted from your details above as you fill them in. Edit it to make it yours.</p>
            </div>
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
              <p className="text-xs text-muted">Edit or replace this as you like.</p>
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
              <h2 className="text-base font-semibold text-foreground">Your rate *</h2>
              <p className="text-sm text-muted mt-0.5">Set your base hourly rate once. Each service is priced from it by its length (a 30-min session is half your hourly rate). Add other currencies for customers abroad.</p>
            </div>
            <CurrencyRatesEditor
              primaryCurrency={currency} onPrimaryCurrency={setCurrency}
              baseRate={hourlyRate} onBaseRate={setHourlyRate}
              rates={currencyRates} onRates={setCurrencyRates}
              smartPricing={smartPricing} onSmartPricing={setSmartPricing}
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="pt-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Services *</h2>
              <p className="text-sm text-muted mt-0.5">
                Tap a session to add it, then set its length and description. Add your own if it&apos;s not
                listed. Offer at least one.
              </p>
            </div>
            <ServiceCatalog value={services} onChange={setServices} categories={categories} hourlyRate={parseFloat(hourlyRate) || undefined} currency={currency} />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="pt-6 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Booking rules *</h2>
              <p className="text-sm text-muted mt-0.5">
                How far ahead mentees can book, how much notice you need, and how late a session can be
                cancelled. A minimum notice of 2 means the soonest slot is 2 hours from now.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Book up to (days ahead, max 90)</span>
                <input type="number" min={1} max={90} value={daysAhead}
                  onChange={(e) => setDaysAhead(parseInt(e.target.value) || 0)}
                  className="h-11 w-40 px-3 rounded-xl bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Minimum booking notice (hrs, max 24)</span>
                <input type="number" min={0} max={24} step={0.5} value={minNotice}
                  onChange={(e) => setMinNotice(parseFloat(e.target.value) || 0)}
                  className="h-11 w-44 px-3 rounded-xl bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Cancellation / reschedule notice (hrs, 2-48)</span>
                <input type="number" min={2} max={48} value={cancelHours}
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
            <div>
              <h2 className="text-base font-semibold text-foreground">Payout details *</h2>
              <p className="text-sm text-muted mt-0.5">
                Update these any time from your Mentor Hub. Your account number is encrypted and never shown in full.
              </p>
            </div>
            <BankDetailsFields value={bank} onChange={setBank} />
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
                {bankError && <li>· {bankError}</li>}
                {!agreedMentor && <li>· Accept the Mentor Agreement.</li>}
              </ul>
            )}
            {error && step === 2 && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="ghost" onClick={backToStep1} disabled={submitting}>← Back</Button>
              <Button type="submit" variant="accent" loading={submitting}>Submit for approval</Button>
            </div>
            <p className="text-xs text-muted">Our team reviews applications within 1-2 business days.</p>
          </CardBody>
        </Card>
      </div>
    </form>
  );
}
