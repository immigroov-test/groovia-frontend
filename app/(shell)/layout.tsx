import { createClient } from '../../lib/supabase/server';
import { TopNav } from '../../components/TopNav';
import { AuthModal } from '../../components/AuthModal';
import { PageTransition } from '../../components/PageTransition';
import { IdleLogout } from '../../components/IdleLogout';
import { AuthStateSync } from '../../components/AuthStateSync';
import { IntroSplash } from '../../components/IntroSplash';
import { FooterSlot } from '../../components/FooterSlot';

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role: string | null = null;
  let name: string | null = null;
  let photoUrl: string | null = null;
  let onboarding = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, display_name, full_name, photo_url')
      .eq('id', user.id)
      .maybeSingle();
    role = profile?.role ?? null;
    name = profile?.display_name ?? profile?.full_name ?? null;
    photoUrl = profile?.photo_url ?? null;

    // A mentor who has not finished first-login setup gets a nav with one destination.
    // Best-effort: if this lookup fails the nav stays full, and the server guards on
    // /mentor and /home still enforce the flow.
    if (role === 'mentor') {
      try {
        const { data: m } = await supabase
          .from('mentors')
          .select('needs_onboarding')
          .eq('profile_id', user.id)
          .maybeSingle();
        onboarding = !!m?.needs_onboarding;
      } catch { /* leave the nav as-is */ }
    }
  }

  return (
    <div className="h-screen overflow-hidden">
      {/* TopNav is a fixed floating overlay (logo + auto-hiding nav), not in flow. */}
      <TopNav authed={!!user} email={user?.email ?? null} role={role} name={name} photoUrl={photoUrl} onboarding={onboarding} />
      {/* The footer goes INSIDE #app-scroll, not after it: the wrapper is h-screen
          overflow-hidden and this element is the only thing that scrolls, so a footer
          placed outside it would never be reachable. */}
      <main id="app-scroll" className="h-full overflow-y-auto pt-16">
        <PageTransition>{children}</PageTransition>
        <FooterSlot />
      </main>
      <AuthModal />
      <IdleLogout authed={!!user} />
      <AuthStateSync />
      <IntroSplash />
    </div>
  );
}
