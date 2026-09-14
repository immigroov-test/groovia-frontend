import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { AccountTabs } from '../../../components/AccountTabs';
import { serverAuth } from '../../../lib/supabase/server';
import { serverGet } from '../../../lib/backend';
import { AppPageHeader } from '../../../components/ui/AppPageHeader';

interface Registration { id: string; status: string; webinars?: { slug: string; title: string; starts_at: string; duration_minutes: number; status: string } | null }

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
  const { token } = await serverAuth();
  const registrationResult = await serverGet<Registration[]>('/webinars/mine', token);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      <AppPageHeader eyebrow="Your account" title={profile?.full_name ? `Hi, ${profile.full_name.split(' ')[0]}` : 'Account'} description="Your sessions, saved guidance, webinars, and profile in one place." />

      <AccountTabs
        userId={user!.id}
        fullName={profile?.full_name ?? ''}
        email={profile?.email ?? ''}
        phone={profile?.phone ?? ''}
        summary={profile?.profile_summary ?? ''}
        role={profile?.role ?? ''}
        registrations={registrationResult.data ?? []}
      />

      {/* Section 7 placement: "linked from account/profile settings page (all
          logged-in users - mentors and customers)." */}
      <p className="mt-10 pt-6 border-t border-(--color-border) text-sm text-muted">
        <Link href="/legal/data-subject-request" className="text-brand-700 hover:underline">
          Request access to, correction of, or deletion of your data
        </Link>
      </p>
    </div>
  );
}