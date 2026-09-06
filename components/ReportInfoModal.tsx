'use client';
import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Button } from './ui/Button';
import { UI_CONTENT } from '../lib/content';

// Shown when the user picks "Generate a career pathway".
//
// Two situations, two versions. Someone already signed in was being told they needed an account,
// and read a paragraph explaining why we ask for a sign-in they had already completed. Only the
// requirement line differs between the two, so it branches on `authed` rather than duplicating a
// whole modal that would then have to be kept in step.
//
// No heading. The logo names the product and the first line says what the report is; a title on
// top of both was the largest thing in a small box while carrying the least information.
export function ReportInfoModal(
  { authed, onProceed, onClose }:
  { authed: boolean; onProceed: () => void; onClose: () => void },
) {
  const r = UI_CONTENT.report;
  const [agreed, setAgreed] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);
  const introId = useId();
  const consentErrorId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  // Escape closes, focus starts inside the dialog, and the page behind it stops scrolling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // The button stays enabled and validates on click. A disabled button gives no reason for being
  // disabled and is skipped by most screen readers.
  function handleProceed() {
    if (!agreed) {
      setShowConsentError(true);
      consentRef.current?.focus();
      return;
    }
    onProceed();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-900/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={introId}
        tabIndex={-1}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-card shadow-2xl
                   border border-[--color-border] p-6 sm:p-7 animate-fade-up focus:outline-none"
      >
        <button
          type="button"
          onClick={onClose}
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
            style={{ height: '22px', width: 'auto' }}
          />
        </div>

        <p id={introId} className="mt-5 text-sm text-foreground leading-relaxed">{r.intro}</p>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          {authed ? r.needsSignedIn : r.needsSignedOut}
        </p>

        {/* BUG-143: explicit consent before a resume is shared and run through a model. Deliberately
            here rather than in a cookie banner: consenting to cookies is not consenting to have your
            CV analysed, and this is the moment the person actually decides. Unticked by default,
            because a pre-ticked box is not consent. */}
        <label className="mt-5 flex items-start gap-2.5 text-left cursor-pointer">
          <input
            ref={consentRef}
            type="checkbox"
            checked={agreed}
            onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setShowConsentError(false); }}
            aria-describedby={showConsentError ? consentErrorId : undefined}
            className="mt-0.5 accent-brand-700 shrink-0"
          />
          <span className="text-xs text-muted leading-relaxed">
            {r.consent}{' '}
            <Link href="/privacy#privacy-policy" target="_blank" className="text-brand-700 hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>

        {showConsentError && (
          <p id={consentErrorId} role="alert" className="mt-2 text-xs text-red-600">{r.consentRequired}</p>
        )}

        <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
          <Button variant="ghost" className="sm:flex-1" onClick={onClose}>{r.cancel}</Button>
          <Button variant="accent" className="sm:flex-1" onClick={handleProceed}>{r.proceed}</Button>
        </div>
      </div>
    </div>
  );
}
