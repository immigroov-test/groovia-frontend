import ChatInterface from '../../../components/ChatInterface';
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

  return <ChatInterface key={t ?? 'main'} authed={!!user} />;
}
