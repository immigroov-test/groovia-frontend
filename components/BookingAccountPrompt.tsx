'use client';
import Image from 'next/image';
import { X } from 'lucide-react';
import { Button } from './ui/Button';

// Shown before payment when a guest books (flight-style checkout). Two options: create a free
// account now, or continue as a guest and pay. Guests still get the confirmation email; to join
// or manage the session they create an account later with the same email (auto-linked).
export function BookingAccountPrompt({
  onProceed, onGuest, onDismiss, email,
}: {
  onProceed: () => void;   // create a free account (resumes the booking after sign-in)
  onGuest: () => void;     // continue as guest -> go straight to payment
  onDismiss: () => void;
  email?: string;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-900/50 backdrop-blur-sm">
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

        <h2 className="mt-5 text-lg font-semibold text-brand-900">How would you like to book?</h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Create a free account to join and manage your session easily, or continue as a guest.
          {' '}Either way we&apos;ll email your confirmation{email ? <> to <span className="font-medium text-foreground">{email}</span></> : null}.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <Button variant="accent" onClick={onProceed}>Create a free account</Button>
          <Button variant="outline" onClick={onGuest}>Continue as guest</Button>
        </div>

        <p className="mt-3 text-[11px] text-muted leading-snug">
          Booking as a guest? You can create an account later with the same email to join and
          manage your session.
        </p>
      </div>
    </div>
  );
}
