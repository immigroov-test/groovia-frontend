import { createClient } from '../../lib/supabase/server';
import { TopNav } from '../../components/TopNav';
import { AuthModal } from '../../components/AuthModal';
import { PageTransition } from '../../components/PageTransition';
import { IdleLogout } from '../../components/IdleLogout';
import { AuthStateSync } from '../../components/AuthStateSync';
import { IntroSplash } from '../../components/IntroSplash';

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role: string | null = null;
  let name: string | null = null;
  let photoUrl: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, display_name, full_name, photo_url')
      .eq('id', user.id)
      .maybeSingle();
    role = profile?.role ?? null;
    name = profile?.display_name ?? profile?.full_name ?? null;
    photoUrl = profile?.photo_url ?? null;
  }

  return (
    <div className="h-screen overflow-hidden">
      {/* TopNav is a fixed floating overlay (logo + auto-hiding nav), not in flow. */}
      <TopNav authed={!!user} email={user?.email ?? null} role={role} name={name} photoUrl={photoUrl} />
      <main id="app-scroll" className="h-full overflow-y-auto pt-16">
        <PageTransition>{children}</PageTransition>
      </main>
      <AuthModal />
      <IdleLogout authed={!!user} />
      <AuthStateSync />
      <IntroSplash />
    </div>
  );
}
