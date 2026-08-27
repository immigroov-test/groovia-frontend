'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Button } from './ui/Button';
import { UI_CONTENT } from '../lib/content';

// Shown when the user picks "Generate a career pathway". Immigroov-branded: what the report is
// (crisp) + why it needs sign-in + résumé (emphasized), then two distinct actions. Handing back
// to the chat runs the login -> résumé -> generate sequence.
export function ReportInfoModal({ onProceed, onClose }: { onProceed: () => void; onClose: () => void }) {
  const r = UI_CONTENT.report;
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-900/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div className="relative w-full max-w-md rounded-3xl bg-card shadow-2xl border border-[--color-border] p-6 sm:p-8 text-center animate-fade-up">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-brand-500 hover:text-brand-900 hover:bg-brand-50"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Immigroov logo at the top */}
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

        <h2 className="mt-5 text-xl font-semibold text-brand-900">{r.title}</h2>

        {/* Short, crisp description of the report */}
        <p className="mt-2 text-sm text-muted leading-relaxed">{r.intro}</p>

        {/* Why sign-in / résumé is needed - emphasized */}
        <p className="mt-5 text-base sm:text-lg font-semibold text-brand-900 leading-snug">{r.why}</p>

        {/* BUG-143: explicit consent before a resume is shared and run through a model. Deliberately
            here rather than in a cookie banner: consenting to cookies is not consenting to have your
            CV analysed, and this is the moment the person actually decides. Unticked by default,
            because a pre-ticked box is not consent. */}
        <label className="mt-6 flex items-start gap-2.5 text-left cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 accent-brand-700 shrink-0"
          />
          <span className="text-xs text-muted leading-relaxed">
            {r.consent}{' '}
            <Link href="/privacy#privacy-policy" target="_blank" className="text-brand-700 hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>

        {/* Two distinct buttons */}
        <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
          <Button variant="ghost" className="sm:flex-1" onClick={onClose}>{r.cancel}</Button>
          <Button variant="accent" className="sm:flex-1" disabled={!agreed} onClick={onProceed}>
            {r.proceed}
          </Button>
        </div>
        {!agreed && <p className="mt-2 text-xs text-muted">{r.consentRequired}</p>}
      </div>
    </div>
  );
}
