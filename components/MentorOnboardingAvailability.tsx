'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';
import { MentorRateEditor } from './MentorRateEditor';
import { ServicesManager } from './ServicesManager';
import { AvailabilityManagerV2 } from './AvailabilityManagerV2';
import { type CurrencyRate } from '../lib/pricing';

interface OnboardingMentor {
  display_name?: string;
  currency?: string | null;
  hourly_rate?: number | null;
  currency_rates?: CurrencyRate[] | null;
  smart_pricing?: boolean | null;
}

// Step 2 of the migrated-mentor first-login flow (reached from the profile step). Collects the rate
// that new mentors give at registration, lets them confirm/extend their imported sessions, and set
// their schedule, then clears the onboarding gate so the hub unlocks. They stay approved/live the
// whole time.
export function MentorOnboardingAvailability({ mentor }: { mentor: OnboardingMentor }) {
  const router = useRouter();
  const [rateSaved, setRateSaved] = useState(!!mentor.hourly_rate && Number(mentor.hourly_rate) > 0);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    if (!rateSaved) { setError('Save your hourly rate above before you finish.'); return; }
    setFinishing(true); setError(null);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const res = await fetch('/api/mentor/complete-onboarding', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || d.error || 'Could not finish setup. Please try again.');
        return;
      }
      router.push('/mentor');
      router.refresh();
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
        <p className="text-sm font-semibold text-brand-900">Step 2 of 2 · Set your rate & sessions</p>
        <p className="text-sm text-muted mt-1">
          Add your hourly rate, confirm the sessions you offer, and set your weekly hours. Finish at
          the bottom to unlock your dashboard.
        </p>
      </div>

      <Section title="Your rate" subtitle="Mentees never see this number directly, we prorate it per session length and localise it to their currency.">
        <MentorRateEditor
          initialCurrency={mentor.currency ?? 'INR'}
          initialRate={mentor.hourly_rate != null ? String(mentor.hourly_rate) : ''}
          initialRates={mentor.currency_rates ?? []}
          initialSmartPricing={!!mentor.smart_pricing}
          onSaved={setRateSaved}
        />
      </Section>

      <Section title="Your sessions" subtitle="These are the sessions we imported for you. You can edit them, or add one of our template sessions (new ones go through a quick review before they appear).">
        <ServicesManager />
      </Section>

      <Section title="Your schedule" subtitle="Set the weekly hours when mentees can book you.">
        <AvailabilityManagerV2 />
      </Section>

      <Card>
        <CardBody className="pt-6 flex flex-col gap-3">
          <h3 className="text-base font-semibold text-foreground">Finish setup</h3>
          <p className="text-sm text-muted">
            {rateSaved
              ? "You're all set. Finish to unlock your dashboard, your profile stays live throughout."
              : 'Save your hourly rate above, then finish to unlock your dashboard.'}
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <Button variant="accent" loading={finishing} disabled={!rateSaved} onClick={finish}>
              Finish & go to dashboard <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted mt-0.5">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
