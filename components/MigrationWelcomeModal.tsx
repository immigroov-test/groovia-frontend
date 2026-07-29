'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, UserCheck, Wallet, CalendarClock } from 'lucide-react';
import { Button } from './ui/Button';

// Blocking first-login popup for a migrated mentor. It only explains what's needed and routes them
// into the flow (review profile -> set rate + confirm sessions). No fields here: the rate is now
// collected on the availability page. The gate is server-side (needs_onboarding), so this popup
// returns on every entry until they finish, even if they close the tab mid-way.
export function MigrationWelcomeModal({ mentorName }: { mentorName?: string }) {
  const router = useRouter();
  const [going, setGoing] = useState(false);

  function start() {
    setGoing(true);
    router.push('/mentor/profile?onboarding=1');
  }

  const first = (mentorName || '').trim().split(' ')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div>
          <h2 className="text-xl font-semibold text-brand-900">
            Welcome{first ? `, ${first}` : ''} 👋
          </h2>
          <p className="text-sm text-muted mt-1.5">
            We imported your profile from immigroov.com so your mentees can find you. Before you can
            use your dashboard, we just need you to finish two quick steps. It takes about 2 minutes.
          </p>
        </div>

        <ol className="flex flex-col gap-3">
          <Step icon={<UserCheck className="h-4 w-4" />} n={1} title="Review your profile"
            desc="Check the details we imported and fill in anything missing." />
          <Step icon={<Wallet className="h-4 w-4" />} n={2} title="Set your rate & sessions"
            desc="Add your hourly rate (in any currencies you like) and confirm the sessions you offer." />
          <Step icon={<CalendarClock className="h-4 w-4" />} n={3} title="You're live"
            desc="Your dashboard unlocks and mentees can book you as usual." />
        </ol>

        <Button variant="accent" loading={going} onClick={start} className="w-full">
          Get started <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
        <p className="text-xs text-muted text-center">You can&apos;t skip this, but you can leave and pick up where you left off anytime.</p>
      </div>
    </div>
  );
}

function Step({ icon, n, title, desc }: { icon: React.ReactNode; n: number; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{n}. {title}</p>
        <p className="text-xs text-muted mt-0.5">{desc}</p>
      </div>
    </li>
  );
}
