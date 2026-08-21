import { redirect } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import { SessionDetail } from '../../../../components/SessionDetail';

export const metadata = { title: 'Session - Immigroov',
  // BUG-144: private page. robots.txt stops the crawl, but a Disallow does not prevent
  // INDEXING: Google can list a URL it found elsewhere, showing a bare result with no description.
  // noindex is the directive that actually keeps it out.
  robots: { index: false, follow: false },
};

// Authorization (candidate / mentor / admin) is enforced by the backend detail
// endpoint; this just ensures the visitor is signed in before mounting the page.
export default async function SessionPage({
  params, searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { bookingId } = await params;
  const { t } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // A signed token from the confirmation email stands in for a session. Guests have no account, so
  // without this they were redirected to /login and could not open a booking they had paid for. The
  // token is verified on the BACKEND; skipping the redirect here only avoids bouncing them before the
  // real check runs, and an invalid token still yields 403 from the API.
  if (!user && !t) redirect(`/login?next=/session/${bookingId}`);
  return <SessionDetail bookingId={bookingId} accessToken={t} />;
}
