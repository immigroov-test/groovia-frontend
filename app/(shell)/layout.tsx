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
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav authed={!!user} email={user?.email ?? null} role={role} />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <PageTransition>{children}</PageTransition>
      </main>
      <AuthModal />
      <IdleLogout authed={!!user} />
    </div>
  );
}
