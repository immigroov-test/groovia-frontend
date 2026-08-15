import { redirect } from 'next/navigation';
import ChatInterface from '../../../components/ChatInterface';
import { createClient } from '../../../lib/supabase/server';

// Canonical is '/', not '/home': the same page is served at both, and without this they compete as
// duplicate content and Google may index whichever it saw first. metadataBase in the root layout
// resolves the relative path against SITE_URL.
export const metadata = { title: 'Immigroov', alternates: { canonical: '/' } };

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

  return <ChatInterface key={t ?? 'main'} authed={!!user} />;
}
