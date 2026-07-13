'use client';
import Image from 'next/image';
import { X } from 'lucide-react';
import { Button } from './ui/Button';

// Shown when a guest tries to book: booking requires an account, so we insist on login/
// signup with a blocking overlay (like the login modal). "Log in or sign up" opens the
// normal auth popup (which resumes the booking after sign-in); "Not now" just closes.
export function BookingAccountPrompt({ onProceed, onDismiss }: { onProceed: () => void; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-900/50 backdrop-blur-sm">
      {/* Backdrop click closes; blocks interaction with everything behind it. */}
      <div className="absolute inset-0" onClick={onDismiss} aria-hidden />

      <div className="relative w-full max-w-sm rounded-3xl bg-card shadow-2xl border border-[--color-border] p-7 text-center animate-fade-up">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-brand-500 hover:text-brand-900 hover:bg-brand-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto w-fit bg-white rounded-full px-4 py-2 shadow-sm">
          <Image
            src="/Immigroov_Transparent_Logo.png"
            alt="Immigroov"
            width={280}
            height={60}
            priority
            className="object-contain"
            style={{ height: '24px', width: 'auto' }}
          />
        </div>

        <h2 className="mt-5 text-lg font-semibold text-brand-900">Log in or sign up to book</h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Log in or create a free account to manage it later and get the most out of Immigroov.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <Button variant="accent" onClick={onProceed}>Log in or sign up</Button>
          <Button variant="ghost" onClick={onDismiss}>Not now</Button>
        </div>
      </div>
    </div>
  );
}
