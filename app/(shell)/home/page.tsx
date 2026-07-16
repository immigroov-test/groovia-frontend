import ChatInterface from '../../../components/ChatInterface';
import { LocationBadge } from '../../../components/LocationBadge';
import { createClient } from '../../../lib/supabase/server';

export const metadata = { title: 'Immigroov' };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <LocationBadge />
      <ChatInterface key={t ?? 'main'} authed={!!user} />
    </>
  );
}
