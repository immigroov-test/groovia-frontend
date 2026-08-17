import { redirect } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import { MeetingRoom } from '../../../../components/MeetingRoom';

export const metadata = { title: 'Video call - Immigroov' };

// The room itself is auth- and time-gated on the backend; this just ensures the
// visitor is logged in before we mount the client meeting component.
export default async function MeetingPage({
  params, searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { bookingId } = await params;
  const { t } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // A guest has no account, so a bare login redirect locked them out of a session they had paid for.
  // The token is verified on the backend; this only avoids bouncing them before that check runs.
  if (!user && !t) redirect(`/login?next=/meeting/${bookingId}`);
  return <MeetingRoom bookingId={bookingId} accessToken={t} />;
}
