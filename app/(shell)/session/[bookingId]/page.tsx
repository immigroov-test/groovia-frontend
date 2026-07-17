import { redirect } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import { SessionDetail } from '../../../../components/SessionDetail';

export const metadata = { title: 'Session - Immigroov' };

// Authorization (candidate / mentor / admin) is enforced by the backend detail
// endpoint; this just ensures the visitor is signed in before mounting the page.
export default async function SessionPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/session/${bookingId}`);
  return <SessionDetail bookingId={bookingId} />;
}
