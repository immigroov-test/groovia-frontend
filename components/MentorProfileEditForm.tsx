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
import { TimezoneSelect } from './ui/TimezoneSelect';
import { RichTextEditor } from './ui/RichTextEditor';
import { Flag } from './ui/Flag';
import { isRichTextEmpty } from '../lib/sanitizeHtml';
import { COUNTRIES } from '../lib/countries';
import { LANGUAGES } from '../lib/languages';
import { COUNTRY_TIMEZONES } from '../lib/countryTimezones';
import { cn } from '../lib/utils';
import { validateCityName } from '../lib/validators';
import { suggestHeadline } from '../lib/headline';

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

interface EditableFields {
  display_name?: string;
  headline?: string | null;
  photo_url?: string | null;
  phone?: string | null;
  bio?: string | null;
  country?: string | null;
  home_country_code?: string | null;
  city?: string | null;
  timezone?: string | null;
  languages?: string[] | null;
  social_links?: SocialLink[] | null;
  public_notes?: string | null;
  expertise_country_codes?: string[] | null;
  expertise_categories?: string[] | null;
  professional_domains?: string[] | null;
  years_lived_experience?: number | null;
  years_professional_experience?: number | null;
  hourly_rate?: number | null;
  currency?: string | null;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'NZD', 'SGD', 'AED', 'CHF'];

export interface MentorProfile extends EditableFields {
  id: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'suspended' | 'changes_requested';
  rejection_reason?: string | null;
  pending_submitted_at?: string | null;
  pending_changes?: EditableFields | null;
  needs_onboarding?: boolean;
}

interface Props {
  mentor: MentorProfile;
  userId?: string;
  // Step 1 of a migrated mentor's first-login flow: edits apply live (no staging), pricing is
  // deferred to the availability step, and saving continues there instead of back to the hub.
  onboarding?: boolean;
}

export function MentorProfileEditForm({ mentor, userId, onboarding = false }: Props) {
  const router = useRouter();

  const locked = mentor.status === 'pending_review' || mentor.status === 'suspended';
  const isApproved = mentor.status === 'approved';
  const hasPendingRevision = isApproved && !!mentor.pending_submitted_at;

  // Approved mentors editing again continue from their staged draft (if any) so they
  // don't lose in-flight changes; everyone else starts from the live values.
  const src: MentorProfile = isApproved && mentor.pending_changes
    ? { ...mentor, ...mentor.pending_changes }
    : mentor;

  const [displayName, setDisplayName] = useState(src.display_name ?? '');
  const [headline, setHeadline] = useState(src.headline ?? '');
  // Existing mentors keep their own headline (edited=true); "Suggest" re-drafts it from their
  // expertise. Placed near the end of the form so the draft has the domain/country to work with.
  const [headlineEdited, setHeadlineEdited] = useState(!!(src.headline ?? '').trim());
  const [photoUrl, setPhotoUrl] = useState<string | null>(src.photo_url ?? null);
  const [phone, setPhone] = useState(src.phone ?? '');
  const [bio, setBio] = useState(src.bio ?? '');
  const [country, setCountry] = useState(src.country ?? '');
  const [homeCountry, setHomeCountry] = useState(src.home_country_code ?? '');
  const [city, setCity] = useState(src.city ?? '');
  const [timezone, setTimezone] = useState(src.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [languages, setLanguages] = useState<string[]>(src.languages ?? []);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(src.social_links ?? []);
  const [publicNotes, setPublicNotes] = useState(src.public_notes ?? '');
  const [expertiseCountries, setExpertiseCountries] = useState<string[]>(src.expertise_country_codes ?? []);
  // Expertise categories are no longer asked for (they're derived from configured services), but we
  // keep the existing value so saving the profile never wipes a legacy mentor's stored categories.
  const [categories] = useState<string[]>(src.expertise_categories ?? []);
  const [yearsExp, setYearsExp] = useState(src.years_lived_experience != null ? String(src.years_lived_experience) : '');
  const [yearsProfExp, setYearsProfExp] = useState(src.years_professional_experience != null ? String(src.years_professional_experience) : '');
  const [domains, setDomains] = useState<string[]>(src.professional_domains ?? []);
  const [hourlyRate, setHourlyRate] = useState(src.hourly_rate != null ? String(src.hourly_rate) : '');
  const [currency, setCurrency] = useState(src.currency ?? 'USD');

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function onCountryChange(code: string) {
    setCountry(code);
    const tz = COUNTRY_TIMEZONES[code];
    if (tz) setTimezone(tz);
  }

  const effectiveHeadline = headlineEdited ? headline : suggestHeadline({ domain: domains[0], country });

  function validate(): string | null {
    if (!displayName.trim()) return 'Full name is required.';
    if (!effectiveHeadline.trim()) return 'Headline is required.';
    if (!country) return 'Please select your current country.';
    if (!homeCountry) return 'Please select your home country.';
    if (languages.length === 0) return 'Select at least one language.';
    if (expertiseCountries.length === 0) return 'Select at least one country of expertise.';
    if (expertiseCountries.length > 2) return 'You can select a maximum of 2 countries of expertise.';
    const profYears = parseInt(yearsProfExp, 10);
    if (!yearsProfExp || isNaN(profYears) || profYears < 0 || profYears > 60) return 'Enter your years of professional experience (0-60).';
    if (yearsExp) { const y = parseInt(yearsExp, 10); if (isNaN(y) || y < 0 || y > 60) return 'Years lived abroad must be between 0 and 60.'; }
    const cityErr = validateCityName(city);
    if (cityErr) return cityErr;
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setError('Session expired. Please log in again.'); return; }
      const res = await fetch('/api/mentor/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          display_name: displayName.trim(),
          headline: effectiveHeadline.trim() || null,
          photo_url: photoUrl || null,
          phone: phone || null,
          bio: isRichTextEmpty(bio) ? null : bio,
          country,
          home_country_code: homeCountry || null,
          city: city.trim() || null,
          timezone,
          languages,
          social_links: socialLinks,
          public_notes: publicNotes.trim() || null,
          expertise_country_codes: expertiseCountries,
          expertise_categories: categories,
          years_lived_experience: yearsExp ? parseInt(yearsExp, 10) : null,
          years_professional_experience: parseInt(yearsProfExp, 10),
          professional_domains: domains,
          hourly_rate: parseFloat(hourlyRate) || null,
          currency,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Save failed. Please try again.'); return; }
      // Onboarding step 1 -> continue to step 2 (rate + sessions). Otherwise back to the hub.
      router.push(onboarding ? '/mentor/availability?onboarding=1' : '/mentor');
      router.refresh();
    } catch {
      setError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // Locked: no editing while the application is under first review or the account is
  // suspended. Show a clear message rather than a disabled-looking form.
  if (locked) {
    return (
      <Card>
        <CardBody className="pt-6 flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            {mentor.status === 'pending_review' ? 'Profile locked while under review' : 'Profile locked'}
          </h2>
          <p className="text-sm text-muted">
            {mentor.status === 'pending_review'
              ? 'Your application is being reviewed. You can edit your profile again once the review is complete.'
              : 'Your mentor account is suspended, so your profile cannot be edited. Please contact support.'}
          </p>
          <div><Link href="/mentor" className="text-sm text-brand-700 hover:underline">← Back to mentor hub</Link></div>
        </CardBody>
      </Card>
    );
  }

  const submitLabel = onboarding
    ? 'Save & continue'
    : isApproved ? 'Submit changes for approval' : 'Resubmit for approval';

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {onboarding ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
          <p className="text-sm font-semibold text-brand-900">Step 1 of 2 · Review your profile</p>
          <p className="text-sm text-muted mt-1">
            We imported these details from immigroov.com. Check them, fill in anything missing, then
            continue to set your rate and sessions.
          </p>
        </div>
      ) : (
        <StatusNotice status={mentor.status} note={mentor.rejection_reason} hasPendingRevision={hasPendingRevision} />
      )}

      <Card>
        <CardBody className="pt-6 flex flex-col gap-5">
          <h2 className="text-base font-semibold text-foreground">Basic info</h2>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2">
              <label className="text-sm font-medium text-foreground">Profile Photo</label>
              <span className="text-xs text-muted">(Recommended)</span>
            </div>
            <PhotoUpload value={photoUrl} onChange={setPhotoUrl} userId={userId} />
          </div>

          <Input label="Full name *" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Priya Nair" autoComplete="name" required />
          <PhoneInput label="Phone Number" value={phone} onChange={setPhone}
            hint="Used for session coordination. Not shown to users." />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-foreground">About you</h2>
          <RichTextEditor value={bio} onChange={setBio} maxChars={BIO_MAX}
            placeholder="Introduce yourself: your experience, skills, and approach towards clients." />
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
              onChange={(e) => setYearsProfExp(e.target.value)} placeholder="e.g. 8" hint="Total years in your profession." />
            <Input label="Years lived abroad" type="number" min={0} max={60} value={yearsExp}
              onChange={(e) => setYearsExp(e.target.value)} placeholder="e.g. 5" hint="Optional. Leave blank if you're a local." />
          </div>
          <Input label="City" value={city} onChange={(e) => setCity(e.target.value)}
            placeholder={country ? 'e.g. Amsterdam' : 'Select a country first'} disabled={!country}
            autoComplete="address-level2" hint="Optional, shown on your public profile." />
          <TimezoneSelect value={timezone} onChange={setTimezone} />
          <MultiSelect label="Languages Spoken *" options={LANGUAGE_OPTIONS} value={languages} onChange={setLanguages}
            placeholder={'Type to search (e.g. "Ja" for Japanese)'} hint="Type and press Enter, or click to add." />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-6 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Social Links</h2>
            <p className="text-sm text-muted mt-0.5">Add links to your public profiles.</p>
          </div>
          <SocialLinks value={socialLinks} onChange={setSocialLinks} hint="Optional, up to one link per platform." />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-6 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Expertise</h2>
            <p className="text-sm text-muted mt-0.5">Determines which mentees you can best serve.</p>
          </div>
          <MultiSelect label="Countries of Expertise * (max 2)" options={COUNTRY_OPTIONS} value={expertiseCountries}
            onChange={setExpertiseCountries} placeholder="Type to search, press Enter to add" maxSelected={2}
            hint="Countries you have direct immigration or career experience in." />
          <MultiSelect label="Domains of Expertise" options={DOMAIN_OPTIONS} value={domains} onChange={setDomains}
            placeholder="Type to search, press Enter to add" hint="Industries or roles you can advise on." />
        </CardBody>
      </Card>

      {!onboarding && (
      <Card>
        <CardBody className="pt-6 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Pricing</h2>
            <p className="text-sm text-muted mt-0.5">
              Immigroov prorates this by each session&apos;s length (a 30-min session is half your hourly rate).
              You can fine-tune individual session prices under your Availability tab.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Hourly rate</label>
              <input type="number" min={0} step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="e.g. 60"
                className="h-10 px-3 rounded-lg bg-white text-sm border border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="h-10 px-3 rounded-lg bg-white text-sm border border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-300">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </CardBody>
      </Card>
      )}

      <Card>
        <CardBody className="pt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-foreground">Headline *</label>
              <button type="button" onClick={() => setHeadlineEdited(false)}
                className="text-xs font-medium text-brand-700 hover:underline">
                Suggest from my expertise
              </button>
            </div>
            <Input value={effectiveHeadline}
              onChange={(e) => { setHeadlineEdited(true); setHeadline(e.target.value); }}
              placeholder="e.g. Software Engineering mentor | Helping you land jobs in the Netherlands" required />
            <p className="text-xs text-muted">Drafted from your expertise above. Edit to make it yours.</p>
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
            <p className={cn('text-xs text-right', publicNotes.length >= NOTES_MAX ? 'text-red-500' : 'text-muted')}>{publicNotes.length}/{NOTES_MAX}</p>
          </div>
        </CardBody>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className={cn('flex items-center gap-3', onboarding ? 'justify-end' : 'justify-between')}>
        {!onboarding && (
          <Link href="/mentor" className="text-sm text-muted hover:text-foreground underline underline-offset-2">← Back to mentor hub</Link>
        )}
        <Button type="submit" variant="accent" loading={saving}>{submitLabel}</Button>
      </div>
    </form>
  );
}

function StatusNotice({ status, note, hasPendingRevision }: {
  status: MentorProfile['status']; note?: string | null; hasPendingRevision: boolean;
}) {
  if (status === 'changes_requested' || status === 'rejected') {
    return (
      <Card><CardBody className="pt-6">
        <h2 className="text-base font-semibold text-foreground">
          {status === 'changes_requested' ? 'Changes requested' : 'Application not approved'}
        </h2>
        {note && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Reviewer note</p>
            <p className="text-sm text-amber-900 mt-1 whitespace-pre-line">{note}</p>
          </div>
        )}
        <p className="text-sm text-muted mt-3">Update your profile below and re-submit for approval.</p>
      </CardBody></Card>
    );
  }
  if (hasPendingRevision) {
    return (
      <Card><CardBody className="pt-6">
        <h2 className="text-base font-semibold text-foreground">Changes awaiting review</h2>
        <p className="text-sm text-muted mt-1">
          Your live profile is unchanged and still bookable. Your edits below will replace it once an admin approves them.
          You can keep editing and re-submit.
        </p>
      </CardBody></Card>
    );
  }
  // Approved with a reviewer note = a previous revision was not applied.
  if (note) {
    return (
      <Card><CardBody className="pt-6">
        <h2 className="text-base font-semibold text-foreground">Your recent changes were not applied</h2>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Reviewer note</p>
          <p className="text-sm text-amber-900 mt-1 whitespace-pre-line">{note}</p>
        </div>
        <p className="text-sm text-muted mt-3">Your live profile is unchanged. Update the fields below and re-submit.</p>
      </CardBody></Card>
    );
  }
  // Approved, no revision in flight.
  return (
    <div className="rounded-lg border border-[--color-border] bg-brand-50/40 p-3">
      <p className="text-sm text-muted">
        Your profile is live. Edits here are reviewed by our team before they replace your public profile.
      </p>
    </div>
  );
}
