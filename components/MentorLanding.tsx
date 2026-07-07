'use client';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  BookOpen,
  CalendarCheck,
  ChevronDown,
  DollarSign,
  UserPlus,
  User,
  ShieldCheck,
  Calendar,
  Rocket,
} from 'lucide-react';
import { Button } from './ui/Button';

const BENEFITS = [
  {
    icon: BadgeCheck,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'Build your personal brand',
    description: 'Showcase your expertise and stand out as a trusted voice in your field.',
  },
  {
    icon: BookOpen,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    title: 'Share your hard-earned experience',
    description: 'Help others with insights from your real-life immigration and career journey.',
  },
  {
    icon: DollarSign,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    title: 'Monetize your time & knowledge',
    description: 'Turn your valuable experience into a meaningful earning opportunity.',
  },
  {
    icon: CalendarCheck,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    title: 'Flexible scheduling',
    description: 'Set your own availability and guide others at your own pace.',
  },
];

const STEPS = [
  {
    icon: UserPlus,
    label: 'Account',
    description: 'Create your account',
  },
  {
    icon: User,
    label: 'Profile',
    description: 'Your info & expertise',
  },
  {
    icon: Calendar,
    label: 'Availability',
    description: 'Set your schedule',
  },
  {
    icon: ShieldCheck,
    label: 'Review',
    description: 'Admin approval',
  },
  {
    icon: Rocket,
    label: 'Go Live',
    description: 'Accept bookings & start earning',
  },
];

export function MentorLanding() {
  const router = useRouter();

  function openSignup() {
    router.push('/mentor/register');
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Left: reasons to join · Right: the vertical journey */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_15rem] gap-8 lg:gap-12 items-start">

        {/* Benefits — stacked one below the other, staggered entrance */}
        <div className="flex flex-col gap-4 reveal-children">
          {BENEFITS.map(({ icon: Icon, iconBg, iconColor, title, description }) => (
            <div
              key={title}
              className="flex gap-4 items-start p-5 rounded-2xl bg-white border border-[--color-border] shadow-sm transition-shadow hover:shadow-md"
            >
              <div className={`shrink-0 flex items-center justify-center w-11 h-11 rounded-xl ${iconBg}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-sm text-muted mt-0.5">{description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* How it works — vertical stepper, no box */}
        <div className="lg:pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-4">How it works</p>
          <ol className="flex flex-col reveal-children">
            {STEPS.map(({ icon: Icon, label, description }, i) => (
              <li key={label} className="flex flex-col">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 ${
                      i === 0
                        ? 'bg-brand-700 border-brand-700 text-white'
                        : 'bg-white border-[--color-border] text-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold leading-none ${i === 0 ? 'text-brand-700' : 'text-foreground'}`}>
                      {label}
                    </p>
                    <p className="mt-1 text-xs text-muted leading-tight">{description}</p>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronDown className="h-4 w-4 text-muted/50 my-1 ml-3" />
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* CTA */}
      <section className="flex flex-col items-center gap-4 animate-fade-up">
        <p className="text-sm text-muted text-center">
          Ready to start? Create a free mentor account and begin the application process.
        </p>
        <Button variant="accent" onClick={openSignup}>Create mentor account</Button>
      </section>
    </div>
  );
}
