'use client';
import { useState } from 'react';
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
import { RichTextEditor } from './ui/RichTextEditor';
import { Flag } from './ui/Flag';
import { isRichTextEmpty } from '../lib/sanitizeHtml';
import { WeeklyAvailabilityGrid, type AvailabilitySlot } from './WeeklyAvailabilityGrid';
import { COUNTRIES } from '../lib/countries';
import { LANGUAGES } from '../lib/languages';
import { COUNTRY_TIMEZONES } from '../lib/countryTimezones';
import { cn } from '../lib/utils';

const DURATION_OPTIONS = [
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '60 min' },
  { minutes: 90, label: '90 min' },
];

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.name, icon: <Flag code={c.code} /> }));
const LANGUAGE_OPTIONS = LANGUAGES.map((l) => ({ value: l.code, label: l.name }));

const DOMAIN_OPTIONS = [
  'Software Engineering', 'Product Management', 'Data Science & AI', 'Design (UX/UI)',
  'Marketing', 'Sales', 'Finance & Banking', 'Healthcare', 'Legal', 'Education',
  'Entrepreneurship', 'Operations', 'HR & Recruiting', 'Consulting', 'Research',
  'Manufacturing', 'Real Estate', 'Media & Journalism', 'Government & Policy', 'Non-profit',
].map((d) => ({ value: d, label: d }));

const BIO_MAX = 2000;
const NOTES_MAX = 500;

// Timezone list with current GMT offset, e.g. "Europe/Amsterdam (GMT+2)".
function tzOffsetLabel(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  } catch {
    return 'GMT';
  }
}
const TZ_OPTIONS = Intl.supportedValuesOf('timeZone').map((tz) => ({
  tz,
  label: `${tz.replace(/_/g, ' ')} (${tzOffsetLabel(tz)})`,
}));

interface Props {
  defaultName?: string;
  userId?: string;
}

export function MentorOnboardingForm({ defaultName = '', userId }: Props) {
  const router = useRouter();

  //Profile fields
  const [displayName, setDisplayName] = useState(defaultName);
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState('');

  //About
  const [bio, setBio] = useState('');

  //Location
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  //Presence
  const [languages, setLanguages] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [publicNotes, setPublicNotes] = useState('');

  // Expertise (critical fields, trigger re-approval)
  const [expertiseCountries, setExpertiseCountries] = useState<string[]>([]);
  const [yearsExp, setYearsExp] = useState('');
  const [domains, setDomains] = useState<string[]>([]);

  //Availability (step 2)
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [duration, setDuration] = useState(60);

  //Agreement
  const [agreedMentor, setAgreedMentor] = useState(false);

  //Wizard state
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function onCountryChange(code: string) {
    setCountry(code);
    const tz = COUNTRY_TIMEZONES[code];
    if (tz) setTimezone(tz);
  }

  // Validate the detail fields (step 1). Returns an error string, or null when valid.
  function validateDetails(): string | null {
    if (!displayName.trim()) return 'Display name is required.';
    if (!professionalTitle.trim()) return 'Professional title is required.';
    if (!country) return 'Please select your current country.';
    if (languages.length === 0) return 'Select at least one language.';
    if (expertiseCountries.length === 0) return 'Select at least one country of expertise.';
    if (expertiseCountries.length > 2) return 'You can select a maximum of 2 countries of expertise.';
    const years = parseInt(yearsExp, 10);
    if (!yearsExp || isNaN(years) || years < 0) return 'Enter your years of lived experience.';
    return null;
  }

  function goToAvailability() {
    const err = validateDetails();
    if (err) { setError(err); return; }
    setError(null);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function backToDetails() {
    setError(null);
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Guard the whole payload in case a user jumps straight to submit.
    const detailErr = validateDetails();
    if (detailErr) { setError(detailErr); setStep(1); return; }
    if (slots.length === 0) { setError('Add at least one weekly availability slot before submitting.'); return; }
    if (!agreedMentor) { setError('Please accept the Mentor Agreement to proceed.'); return; }
    const years = parseInt(yearsExp, 10);

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setError('Session expired. Please log in again.'); return; }

      const res = await fetch('/api/mentor/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
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
          years_lived_experience: years,
          professional_domains: domains,
          agreed_to_mentor_terms: true,
          session_duration_minutes: duration,
          availability_slots: slots,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Something went wrong. Please try again.');
        return;
      }
      if (!data.id) {
        setError('Unexpected response from server. Please try again.');
        return;
      }
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

      {/* ── Step indicator ──────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {[
          { n: 1 as const, label: 'Your details' },
          { n: 2 as const, label: 'Availability' },
        ].map(({ n, label }, i) => (
          <div key={n} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                step >= n ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-600',
              )}>{n}</span>
              <span className={cn('text-sm', step === n ? 'font-semibold text-foreground' : 'text-muted')}>{label}</span>
            </div>
            {i === 0 && <div className={cn('h-px w-8', step === 2 ? 'bg-brand-500' : 'bg-[--color-border]')} />}
          </div>
        ))}
      </div>

      {/* ══ STEP 1: DETAILS ═════════════════════════════════════════ */}
      <div className={cn('flex-col gap-6', step === 1 ? 'flex' : 'hidden')}>

      {/* ── Section 1: Profile ──────────────────────────────────── */}
      <Card>
        <CardBody className="pt-6 flex flex-col gap-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Profile Settings</h2>
            <p className="text-sm text-muted mt-0.5">Basic info, expertise, languages</p>
          </div>

          {/* Photo */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2">
              <label className="text-sm font-medium text-foreground">Profile Photo</label>
              <span className="text-xs text-muted">(Recommended, helps mentees connect with you)</span>
            </div>
            <PhotoUpload value={photoUrl} onChange={setPhotoUrl} userId={userId} />
          </div>

          {/* Display name */}
          <Input
            label="Full name *"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Priya Nair"
            autoComplete="name"
            required
          />

          {/* Headline */}
          <Input
            label="Headline *"
            value={professionalTitle}
            onChange={(e) => setProfessionalTitle(e.target.value)}
            placeholder="e.g. Supply Chain Professional, Software Engineer, AI Developer, Career Expert"
            required
          />

          {/* Phone */}
          <PhoneInput
            label="Phone Number"
            value={phone}
            onChange={setPhone}
            required
            hint="Used for session coordination. Not shown to users."
          />
        </CardBody>
      </Card>

      {/* ── Section 2: About You ─────────────────────────────────── */}
      <Card>
        <CardBody className="pt-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-foreground">About You *</h2>
          <RichTextEditor
            value={bio}
            onChange={setBio}
            maxChars={BIO_MAX}
            placeholder="Introduce yourself: your experience, skills, and approach towards clients. Use the toolbar for bullet points or emphasis."
          />
        </CardBody>
      </Card>

      {/* ── Section 3: Location & Languages ─────────────────────── */}
      <Card>
        <CardBody className="pt-6 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Location & Languages</h2>
          </div>

          {/* Country (where they live now) */}
          <CountrySelect
            label="Country"
            value={country}
            onChange={onCountryChange}
            required
            placeholder="Select your current country"
            hint="Country you currently live in."
          />

          {/* City */}
          <Input
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={country ? 'e.g. Amsterdam' : 'Select a country first'}
            disabled={!country}
            autoComplete="address-level2"
            hint="Optional, shown on your public profile."
          />

          {/* Timezone: auto-filled from country, editable */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={cn(
                'h-10 px-3 rounded-lg bg-white text-sm text-foreground',
                'shadow-[0_0_0_1px_rgba(15,23,42,0.06)]',
                'focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]',
              )}
            >
              {TZ_OPTIONS.map(({ tz, label }) => (
                <option key={tz} value={tz}>{label}</option>
              ))}
            </select>
            <p className="text-xs text-muted">Auto-selected from your country. You can adjust it.</p>
          </div>

          {/* Languages */}
          <MultiSelect
            label="Languages Spoken *"
            options={LANGUAGE_OPTIONS}
            value={languages}
            onChange={setLanguages}
            placeholder={'Type to search (e.g. "Ja" → Japanese)…'}
            hint="Type and press Enter, or click to add."
          />
        </CardBody>
      </Card>

      {/* ── Section 4: Social Links ──────────────────────────────── */}
      <Card>
        <CardBody className="pt-6 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Social Links</h2>
            <p className="text-sm text-muted mt-0.5">
              Add links to your public profiles. Helps mentees learn more about you.
            </p>
          </div>
          <SocialLinks value={socialLinks} onChange={setSocialLinks} hint="Optional, up to one link per platform." />
        </CardBody>
      </Card>

      {/* ── Section 5: Expertise ─────────────────────────────────── */}
      <Card>
        <CardBody className="pt-6 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Expertise</h2>
            <p className="text-sm text-muted mt-0.5">
              These fields determine which mentees you can best serve. Changes here will require
              re-approval by our team.
            </p>
          </div>

          <MultiSelect
            label="Countries of Expertise * (max 2)"
            options={COUNTRY_OPTIONS}
            value={expertiseCountries}
            onChange={setExpertiseCountries}
            placeholder="Type to search, press Enter to add…"
            maxSelected={2}
            hint="Countries you have direct immigration or career experience in. Type and press Enter, or click to add."
          />

          <Input
            label="Years of Lived Experience *"
            type="number"
            min={0}
            max={60}
            value={yearsExp}
            onChange={(e) => setYearsExp(e.target.value)}
            placeholder="e.g. 5"
            hint="Total years you have lived or worked abroad as an immigrant."
          />

          <MultiSelect
            label="Domains of Expertise"
            options={DOMAIN_OPTIONS}
            value={domains}
            onChange={setDomains}
            placeholder="Type to search, press Enter to add…"
            hint="Industries or roles you can advise on. Type and press Enter, or click to add."
          />
        </CardBody>
      </Card>

      {/* ── Section 6: Public Notes ──────────────────────────────── */}
      <Card>
        <CardBody className="pt-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-foreground">Public Notes</h2>
          <div className="flex flex-col gap-1.5">
            <textarea
              rows={3}
              value={publicNotes}
              onChange={(e) => setPublicNotes(e.target.value.slice(0, NOTES_MAX))}
              placeholder="Anything clients should know before booking (visible on your profile). e.g. I only accept sessions in English; I specialise in Netherlands visa pathways."
              className={cn(
                'px-3 py-2 rounded-lg bg-white text-sm text-foreground resize-y',
                'placeholder:text-muted',
                'shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]',
                'focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]',
              )}
            />
            <p className={cn('text-xs text-right', publicNotes.length >= NOTES_MAX ? 'text-red-500' : 'text-muted')}>
              {publicNotes.length}/{NOTES_MAX}
            </p>
          </div>
        </CardBody>
      </Card>

      {/* ── Step 1 footer: continue to availability ──────────────── */}
      {error && step === 1 && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end">
        <Button type="button" variant="accent" onClick={goToAvailability}>
          Continue to availability →
        </Button>
      </div>

      </div>{/* end STEP 1 */}

      {/* ══ STEP 2: AVAILABILITY ════════════════════════════════════ */}
      <div className={cn('flex-col gap-6', step === 2 ? 'flex' : 'hidden')}>
        <Card>
          <CardBody className="pt-6 flex flex-col gap-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">Your weekly availability</h2>
              <p className="text-sm text-muted mt-0.5">
                Set when you&apos;re usually free. Mentees will only be able to book inside these windows.
                You can fine-tune this anytime after approval.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Session duration</span>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map(({ minutes, label }) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setDuration(minutes)}
                    className={cn(
                      'flex-1 h-10 rounded-lg border text-sm font-medium transition-colors',
                      duration === minutes
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'border-[--color-border] text-muted hover:text-foreground hover:border-brand-300',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <WeeklyAvailabilityGrid value={slots} onChange={setSlots} sessionDurationMinutes={duration} />
          </CardBody>
        </Card>

        {/* Agreement & Submit */}
        <Card>
          <CardBody className="pt-6 flex flex-col gap-4">
            <label className="text-sm text-muted flex items-start gap-2 select-none cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 accent-[--color-brand-500]"
                checked={agreedMentor}
                onChange={(e) => setAgreedMentor(e.target.checked)}
              />
              <span>
                I agree to the{' '}
                <Link href="/terms" className="underline hover:text-foreground">Mentor Agreement</Link>,
                Data Processing Agreement, and commission structure. I consent to anonymised session
                insights being used to improve Groovia.
              </span>
            </label>

            {error && step === 2 && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="ghost" onClick={backToDetails} disabled={submitting}>
                ← Back to details
              </Button>
              <Button type="submit" variant="accent" loading={submitting}>
                Submit application
              </Button>
            </div>
            <p className="text-xs text-muted">
              Your details and availability are submitted together. Our team reviews applications within 1-2 business days.
            </p>
          </CardBody>
        </Card>
      </div>{/* end STEP 2 */}
    </form>
  );
}
