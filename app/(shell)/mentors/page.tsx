import { MentorBrowser } from '../../../components/MentorBrowser';
import type { Mentor } from '../../../lib/types';
import { backendBaseUrl } from '../../../lib/backend';

async function fetchMentors(): Promise<Mentor[]> {
  try {
    const res = await fetch(`${backendBaseUrl()}/mentors`, { cache: 'no-store' });
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
};

export default async function MentorsPage() {
  const mentors = await fetchMentors();

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm font-medium text-accent-600 mb-2">Mentors</p>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-brand-900">
          People who already made the move.
        </h1>
        <p className="mt-3 text-muted">
          Honest conversations, real timelines, lived experience. Browse below or let Groovia
          recommend a match.
        </p>
      </div>

      {mentors.length === 0 ? (
        <div className="text-center py-20 text-muted">
          No mentors loaded yet. (Backend not running, or empty database.)
        </div>
      ) : (
        <MentorBrowser mentors={mentors} />
      )}
    </div>
  );
}
