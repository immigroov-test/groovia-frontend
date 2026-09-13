import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { AccountTabs } from '../../../components/AccountTabs';

export const metadata = { title: 'Account - Immigroov',
  // BUG-144: private page. robots.txt stops the crawl, but a Disallow does not prevent
  // INDEXING: Google can list a URL it found elsewhere, showing a bare result with no description.
  // noindex is the directive that actually keeps it out.
  robots: { index: false, follow: false },
};

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

      {/* Section 7 placement: "linked from account/profile settings page (all
          logged-in users - mentors and customers)." */}
      <p className="mt-8 pt-6 border-t border-[--color-border] text-sm text-muted">
        <Link href="/legal/data-subject-request" className="text-brand-700 hover:underline">
          Request access to, correction of, or deletion of your data
        </Link>
      </p>
    </div>
  );
}
