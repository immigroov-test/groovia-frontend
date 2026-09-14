import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { MentorBrowser } from '../../../components/MentorBrowser';
import type { Mentor } from '../../../lib/types';
import { backendBaseUrl } from '../../../lib/backend';

async function fetchMentors(): Promise<Mentor[]> {
  try {
    // The directory shows every mentor, so request a high cap (the backend still filters to
    // approved + active + bookable). Bump this if the roster ever approaches it.
    const res = await fetch(`${backendBaseUrl()}/mentors?limit=300`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.mentors ?? [];
  } catch {
    return [];
  }
}

export const metadata = {
  title: 'Mentors - Immigroov',
  description: 'Browse mentors who have lived your immigration journey.',
  alternates: { canonical: '/mentors' },
};

export default async function MentorsPage() {
  const mentors = await fetchMentors();

  return (
    <div className="container-public py-16 sm:py-20">
      <div className="mb-12">
        <PageHeader eyebrow="Find a mentor" title="People who already made the move." description="Compare people by destination, language, lived experience, and the sessions they offer." />
        <Link href="/mentor-verification" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900"><ShieldCheck className="h-4 w-4" />How mentor approval works</Link>
      </div>

      {mentors.length === 0 ? (
        <EmptyState icon={<ShieldCheck className="h-5 w-5" />} title="No mentors are available right now." description="Please check back as new profiles are approved." />
      ) : (
        <MentorBrowser mentors={mentors} />
      )}
    </div>
  );
}