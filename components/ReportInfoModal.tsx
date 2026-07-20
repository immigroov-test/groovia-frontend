'use client';
import Image from 'next/image';
import { X } from 'lucide-react';
import { Button } from './ui/Button';
import { UI_CONTENT } from '../lib/content';

// Shown when the user picks "Generate a career pathway". Immigroov-branded: what the report is
// (crisp) + why it needs sign-in + résumé (emphasized), then two distinct actions. Handing back
// to the chat runs the login -> résumé -> generate sequence.
export function ReportInfoModal({ onProceed, onClose }: { onProceed: () => void; onClose: () => void }) {
  const r = UI_CONTENT.report;
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

        {/* Two distinct buttons */}
        <div className="mt-7 flex flex-col sm:flex-row gap-2.5">
          <Button variant="ghost" className="sm:flex-1" onClick={onClose}>{r.cancel}</Button>
          <Button variant="accent" className="sm:flex-1" onClick={onProceed}>{r.proceed}</Button>
        </div>
      </div>
    </div>
  );
}
