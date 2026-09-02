'use client';
import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, FileText, UserPlus, X } from 'lucide-react';
import { Button } from './ui/Button';
import { UI_CONTENT } from '../lib/content';

// Shown when the user picks "Generate a career pathway": what the report is, what we need in order
// to build it, and the resume consent, in that order.
//
// The content used to be three paragraphs of roughly equal weight, with the sign-in requirement set
// larger than everything else, so the thing the person was being asked to decide was the least
// visible part. It now reads top to bottom as one decision: here is what you get, here is what it
// costs you, here is the box, here is the button.
export function ReportInfoModal({ onProceed, onClose }: { onProceed: () => void; onClose: () => void }) {
  const r = UI_CONTENT.report;
  const [agreed, setAgreed] = useState(false);
  const [showConsentError, setShowConsentError] = useState(false);
  const titleId = useId();
  const consentErrorId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  // Escape closes, focus starts inside the dialog, and the page behind it stops scrolling. Standard
  // modal behaviour that this one was missing.
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

  // The primary button stays enabled and validates on click rather than sitting disabled. A disabled
  // button gives no reason for being disabled and is skipped by most screen readers; validating on
  // click lets us say what is missing and put the cursor on it.
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
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-card shadow-2xl
                   border border-[--color-border] p-6 sm:p-8 animate-fade-up focus:outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-brand-500 hover:text-brand-900 hover:bg-brand-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center">
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
          <h2 id={titleId} className="mt-5 text-xl sm:text-2xl font-semibold text-brand-900">{r.title}</h2>
          <p className="mt-2 text-sm text-muted leading-relaxed">{r.intro}</p>
        </div>

        {/* What you get, then what it asks of you. Left aligned: centred text is fine for a heading
            but slows down anything the eye has to scan line by line. */}
        <div className="mt-6 space-y-5 text-left">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-500">{r.givesLabel}</h3>
            <ul className="mt-2.5 space-y-2">
              {r.gives.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-foreground leading-relaxed">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl bg-brand-50/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-500">{r.needsLabel}</h3>
            <ul className="mt-2.5 space-y-2">
              {r.needs.map((item, i) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-foreground leading-relaxed">
                  {i === 0
                    ? <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
                    : <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />}
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

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

        {/* Primary action last, which is where it is expected on desktop and the natural end of the
            reading order on mobile. */}
        <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
          <Button variant="ghost" className="sm:flex-1" onClick={onClose}>{r.cancel}</Button>
          <Button variant="accent" className="sm:flex-1" onClick={handleProceed}>{r.proceed}</Button>
        </div>
      </div>
    </div>
  );
}
