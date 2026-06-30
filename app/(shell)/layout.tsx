import { createClient } from '../../lib/supabase/server';
import { TopNav } from '../../components/TopNav';
import { AuthModal } from '../../components/AuthModal';
import { PageTransition } from '../../components/PageTransition';
import { IdleLogout } from '../../components/IdleLogout';

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    role = profile?.role ?? null;
  }

  return (
    <div className="h-screen overflow-hidden">
      {/* TopNav is a fixed floating overlay (logo + auto-hiding nav), not in flow. */}
      <TopNav authed={!!user} email={user?.email ?? null} role={role} />
      <main id="app-scroll" className="h-full overflow-y-auto pt-16">
        <PageTransition>{children}</PageTransition>
      </main>
      <AuthModal />
      <IdleLogout authed={!!user} />
    </div>
  );
}
