import { createClient } from '../../../lib/supabase/server';
import { AccountTabs } from '../../../components/AccountTabs';

export const metadata = { title: 'Account - Immigroov' };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, phone, profile_summary, role')
    .eq('id', user!.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-900">Account</h1>
      <p className="text-sm text-muted mt-1">Your profile, contact details, and sessions.</p>

      <AccountTabs
        userId={user!.id}
        fullName={profile?.full_name ?? ''}
        email={profile?.email ?? ''}
        phone={profile?.phone ?? ''}
        summary={profile?.profile_summary ?? ''}
        role={profile?.role ?? ''}
      />
    </div>
  );
}
