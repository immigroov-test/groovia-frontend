'use client';
import { X, Check, FileText } from 'lucide-react';
import { Button } from './ui/Button';
import { UI_CONTENT } from '../lib/content';

// Shown when the user picks "Generate a career pathway". Explains what the report produces and
// why it needs sign-in + a résumé (it analyzes their own profile), then hands back to the chat
// which runs the login -> résumé -> generate sequence. "Not now" just closes.
export function ReportInfoModal({ onProceed, onClose }: { onProceed: () => void; onClose: () => void }) {
  const r = UI_CONTENT.report;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-900/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div className="relative w-full max-w-md rounded-3xl bg-card shadow-2xl border border-[--color-border] p-6 sm:p-7 animate-fade-up">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-brand-500 hover:text-brand-900 hover:bg-brand-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <span className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-brand-700 to-accent-500 text-white flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-semibold text-brand-900">{r.title}</h2>
        </div>

        <p className="mt-3 text-sm text-muted leading-relaxed">{r.intro}</p>

        <ul className="mt-4 flex flex-col gap-2.5">
          {r.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-foreground">
              <Check className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 rounded-xl bg-brand-50/70 px-3.5 py-3 text-xs leading-relaxed text-muted">
          {r.why}
        </p>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <Button variant="ghost" onClick={onClose}>{r.cancel}</Button>
          <Button variant="accent" onClick={onProceed}>{r.proceed}</Button>
        </div>
      </div>
    </div>
  );
}
