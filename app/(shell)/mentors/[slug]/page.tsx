import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardBody } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import { RichText } from '../../../../components/ui/RichText';
import { DirectBookingWidget } from '../../../../components/DirectBookingWidget';
import { ReviewsList } from '../../../../components/Reviews';
import type { Mentor } from '../../../../lib/types';
import { backendBaseUrl, serverGet } from '../../../../lib/backend';
import { serverAuth } from '../../../../lib/supabase/server';
import { countryLabel } from '../../../../lib/countries';
import { languageLabel } from '../../../../lib/languages';
import { currencySymbol } from '../../../../lib/pricing';
import { richTextToPlain } from '../../../../lib/sanitizeHtml';
import { SITE_URL } from '../../../../lib/site';

interface ServiceItem { id: string; title: string; duration: number; set_price: number; set_currency: string; }

async function fetchMentor(slug: string): Promise<Mentor | null> {
  try {
    const res = await fetch(`${backendBaseUrl()}/mentors/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// BUG-058: every mentor page previously fell back to the site's generic default title/description
// (app/layout.tsx) and had no Open Graph data at all - identical metadata across every mentor made
// them indistinguishable to search engines and to link previews shared in chat/social.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const mentor = await fetchMentor(slug);
  if (!mentor) return {};
  const title = `${mentor.display_name}${mentor.headline ? ` - ${mentor.headline}` : ''} - Immigroov Mentor`;
  const description = (mentor.bio ? richTextToPlain(mentor.bio) : '').slice(0, 160)
    || `Book a 1-on-1 session with ${mentor.display_name} on Immigroov.`;
  const url = `${SITE_URL}/mentors/${mentor.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'profile', title, description, url,
      images: mentor.photo_url ? [{ url: mentor.photo_url }] : undefined,
    },
    twitter: {
      card: mentor.photo_url ? 'summary' : 'summary_large_image',
      title, description,
      images: mentor.photo_url ? [mentor.photo_url] : undefined,
    },
  };
}

// True when the signed-in viewer is the mentor whose profile this is (BUG-129). Anonymous visitors
// and non-mentors short-circuit without an extra request.
async function viewerIsThisMentor(slug: string): Promise<boolean> {
  try {
    const { user, token } = await serverAuth();
    if (!user || !token) return false;
    const me = await serverGet<{ slug?: string | null }>('/mentor/me', token);
    return !!(me.ok && me.data?.slug && me.data.slug === slug);
  } catch { return false; }
}

async function fetchServices(slug: string): Promise<ServiceItem[]> {
  try {
    const res = await fetch(`${backendBaseUrl()}/mentor/services/public/${slug}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.services ?? [];
  } catch { return []; }
}

export default async function MentorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [mentor, services] = await Promise.all([fetchMentor(slug), fetchServices(slug)]);
  if (!mentor) notFound();

  // BUG-129: a mentor viewing their OWN public profile gets a read-only preview. The backend already
  // refuses a self-booking at reserve/book, but letting them walk the whole flow only to fail at
  // payment is misleading, so the booking UI is not offered here at all.
  const isOwnProfile = await viewerIsThisMentor(slug);
  const hasDirectBooking = services.length > 0 && !isOwnProfile;

  const profileBlock = (
    <header className="flex flex-col gap-3 mb-8">
      {mentor.photo_url && (
        <img
          src={mentor.photo_url}
          alt={mentor.display_name}
          className="h-20 w-20 rounded-full object-cover"
        />
      )}
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-brand-900">
        {mentor.display_name}
      </h1>
      {mentor.headline && (
        <p className="text-lg text-muted leading-relaxed">{mentor.headline}</p>
      )}
      <div className="flex flex-col gap-2 mt-2">
        {mentor.expertise_country_codes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Guides moves to</span>
            {mentor.expertise_country_codes.map((c) => (
              <Badge key={c} tone="brand">{countryLabel(c)}</Badge>
            ))}
          </div>
        )}
        {(mentor.expertise_categories ?? []).length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Focus areas</span>
            {(mentor.expertise_categories ?? []).map((cat) => (
              <Badge key={cat} tone="accent">{cat}</Badge>
            ))}
          </div>
        )}
        {mentor.languages.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Speaks</span>
            {mentor.languages.map((lang) => (
              <Badge key={lang} tone="neutral">{languageLabel(lang)}</Badge>
            ))}
          </div>
        )}
      </div>
    </header>
  );

  // ── Direct booking (new system) ──────────────────────────────────────────────
  if (hasDirectBooking) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        {/* The widget renders its own top nav link (context-aware: "All mentors" on the service
            step, "Back to service" once past it, so it never drops the user out of an in-progress
            booking), plus the mentor header (identity, rating, timezones), bio, stepper and the
            two-column booking layout. */}
        <DirectBookingWidget
          mentorTimezone={mentor.timezone ?? undefined}
          mentor={{
            id:           mentor.id,
            slug:         mentor.slug,
            display_name: mentor.display_name,
            headline:     mentor.headline ?? null,
            bio:          mentor.bio ?? null,
            photo_url:    mentor.photo_url ?? null,
            city:         mentor.city ?? null,
            country:      mentor.country ?? null,
            avg_rating:   mentor.avg_rating ?? null,
            review_count: mentor.review_count ?? null,
            smart_pricing: mentor.smart_pricing ?? false,
            // BUG-100: previously dropped entirely for mentors with direct booking.
            home_country_code: mentor.home_country_code ?? null,
            years_lived_experience: mentor.years_lived_experience ?? null,
            languages: mentor.languages,
            professional_domains: mentor.professional_domains,
            expertise_country_codes: mentor.expertise_country_codes,
          }}
        />

        <section id="reviews" className="mt-10 scroll-mt-24">
          <h2 className="text-lg font-semibold text-foreground mb-4">Reviews</h2>
          <ReviewsList mentorId={mentor.id} />
        </section>
      </div>
    );
  }

  // ── Fallback: profile view, no booking yet ───────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <Link href="/mentors" className="text-sm text-muted hover:text-foreground inline-flex items-center mb-6">
        ← All mentors
      </Link>

      {profileBlock}

      {mentor.bio && (
        <Card className="mb-6">
          <CardBody className="pt-6">
            <h2 className="text-base font-semibold text-foreground mb-2">About</h2>
            <RichText html={mentor.bio} />
          </CardBody>
        </Card>
      )}

      {isOwnProfile ? (
        <Card className="border-dashed">
          <CardBody className="pt-6">
            <h2 className="text-base font-semibold text-foreground">This is your public profile</h2>
            <p className="text-sm text-muted mt-1">
              This is exactly how mentees see you. Booking is read-only here, since you can&apos;t book your
              own sessions.
            </p>
            {services.length > 0 && (
              <ul className="mt-4 flex flex-col gap-2">
                {services.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg bg-brand-50/50 px-3 py-2">
                    <span className="text-sm text-foreground min-w-0 truncate">{s.title}</span>
                    <span className="text-sm text-muted shrink-0">
                      {s.duration} min · {currencySymbol(s.set_currency)}{s.set_price.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
              <Link href="/mentor" className="text-brand-700 hover:text-brand-900">Edit your profile</Link>
              <Link href="/mentor/availability" className="text-brand-700 hover:text-brand-900">Manage availability</Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardBody className="pt-6">
            <h2 className="text-base font-semibold text-foreground">Book a 1-on-1 session</h2>
            <p className="text-sm text-muted mt-1">
              {mentor.display_name.split(' ')[0]} is setting up their calendar. Check back soon.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
