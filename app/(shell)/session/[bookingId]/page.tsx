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
export default async function SessionPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/session/${bookingId}`);
  return <SessionDetail bookingId={bookingId} />;
}
