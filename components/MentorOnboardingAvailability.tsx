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
  // Backend-derived starting values for the rate form (from the mentor's own imported sessions).
  rate_prefill?: { currency?: string | null; hourly_rate?: number | null } | null;
}

// Step 2 of the migrated-mentor first-login flow (reached from the profile step). Collects the rate
// that new mentors give at registration, lets them confirm/extend their imported sessions, and set
// their schedule, then clears the onboarding gate so the hub unlocks. They stay approved/live the
// whole time.
export function MentorOnboardingAvailability({ mentor }: { mentor: OnboardingMentor }) {
  const router = useRouter();
  // The backend's prefill wins outright when present (derived from the mentor's own sessions); the
  // stored mentor row is only a last resort, since the import left its currency wrong on many mentors.
  // A prefill with a null rate is deliberate (no session to derive from): leave the amount blank.
  const prefill = mentor.rate_prefill;
  const prefillCurrency = prefill?.currency ?? mentor.currency ?? 'INR';
  const prefillRate = prefill ? prefill.hourly_rate : mentor.hourly_rate;
  const [rateSaved, setRateSaved] = useState(!!prefillRate && Number(prefillRate) > 0);
  // ServicesManager used to be rendered here with no rate at all, so it always believed no base rate
  // existed and refused to add a paid session right after one had been saved on this very page.
  const [savedRate, setSavedRate] = useState<number | undefined>(
    prefillRate != null && Number(prefillRate) > 0 ? Number(prefillRate) : undefined);
  const [savedCurrency, setSavedCurrency] = useState<string>(prefillCurrency);
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
        <p className="text-sm font-semibold text-brand-900">Step 2 of 2 · Rate &amp; sessions</p>
        <p className="text-sm text-muted mt-1">Finish at the bottom to go live.</p>
      </div>

      <Section title="Your rate">
        <MentorRateEditor
          initialCurrency={prefillCurrency}
          initialRate={prefillRate != null ? String(prefillRate) : ''}
          initialRates={mentor.currency_rates ?? []}
          initialSmartPricing={!!mentor.smart_pricing}
          onSaved={(saved, r, c) => {
            setRateSaved(saved);
            if (saved && r) { setSavedRate(r); if (c) setSavedCurrency(c); }
          }}
        />
      </Section>

      <Section title="Your sessions">
        <ServicesManager hourlyRate={savedRate} currency={savedCurrency} />
      </Section>

      <Section title="Your schedule" subtitle="When mentees can book you.">
        <AvailabilityManagerV2 />
      </Section>

      <Card>
        <CardBody className="pt-6 flex flex-col gap-3">
          <h3 className="text-base font-semibold text-foreground">Finish setup</h3>
          <p className="text-sm text-muted">
            {rateSaved ? "You're all set." : 'Save your rate above to finish.'}
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

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
