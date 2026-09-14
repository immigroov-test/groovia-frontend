import { redirect } from 'next/navigation';
import ChatInterface from '../../../components/ChatInterface';
import { createClient } from '../../../lib/supabase/server';
import { backendBaseUrl, serverGetPublic } from '../../../lib/backend';
import type { Mentor } from '../../../lib/types';
import type { Webinar } from '../../../lib/webinars';

// Canonical is '/', not '/home': the same page is served at both, and without this they compete as
// duplicate content and Google may index whichever it saw first. metadataBase in the root layout
// resolves the relative path against SITE_URL.
export const metadata = { title: 'Immigroov', alternates: { canonical: '/' } };

// The homepage is a trust surface, so prefer profiles that give a visitor enough information to
// make a decision. The public mentor endpoint already returns approved, active, bookable mentors;
// this score ranks that eligible roster by presentation completeness without inventing popularity.
function profileCompleteness(mentor: Mentor): number {
  return (mentor.photo_url ? 5 : 0)
    + (mentor.bio && mentor.bio.replace(/<[^>]*>/g, '').trim().length >= 80 ? 4 : 0)
    + (mentor.headline ? 2 : 0)
    + (mentor.min_price_service_id || mentor.has_free_session ? 4 : 0)
    + (mentor.expertise_country_codes?.length ? 2 : 0)
    + (mentor.languages?.length ? 1 : 0)
    + (mentor.years_lived_experience ? 1 : 0);
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // A migrated mentor who hasn't finished first-login onboarding must land on their dashboard,
  // where the mandatory welcome popup fires - otherwise they can sit on /home and never see it.
  // Best-effort: if the lookup fails, the /mentor hub's own server-side gate still enforces it.
  let sendToMentorHub = false;
  if (user) {
    try {
      const { data: m } = await supabase
        .from('mentors')
        .select('needs_onboarding')
        .eq('profile_id', user.id)
        .maybeSingle();
      sendToMentorHub = !!m?.needs_onboarding;
    } catch { /* lookup failed - fall through to the normal home page */ }
  }
  if (sendToMentorHub) redirect('/mentor');

  let mentors: Mentor[] = [];
  try {
    const response = await fetch(`${backendBaseUrl()}/mentors?limit=300`, { next: { revalidate: 300 } });
    if (response.ok) {
      const roster: Mentor[] = (await response.json()).mentors ?? [];
      const ranked = roster
        .map((mentor, index) => ({ mentor, index, score: profileCompleteness(mentor) }))
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .map(({ mentor }) => mentor);
      // The first three feed the full mentor cards. The rest only feed the hero photo strip, so they
      // are limited to mentors with a photo and stripped of their bio to keep the page payload small.
      mentors = [
        ...ranked.slice(0, 3),
        ...ranked.slice(3).filter((m) => m.photo_url).slice(0, 27).map((m) => ({ ...m, bio: null })),
      ];
    }
  } catch { /* the homepage remains useful while the backend wakes */ }
  const webinarResult = await serverGetPublic<Webinar[]>('/webinars', 8000, 1, 2);
  return <ChatInterface key={t ?? 'main'} authed={!!user} featuredMentors={mentors} upcomingWebinars={webinarResult.data ?? []} />;
}