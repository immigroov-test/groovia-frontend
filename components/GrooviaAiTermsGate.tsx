'use client';
import { Bot, X } from 'lucide-react';
import { Button } from './ui/Button';
import { LegalMarkdown } from './LegalMarkdown';

/** Groovia AI Terms of Use — a one-time gate on the FIRST message sent to Groovia.
 *
 * Distinct from the AI Disclosure Notice (a passive, always-visible label saying
 * "you're talking to an AI" - the EU AI Act Art. 50 transparency requirement): this is
 * the liability/usage agreement itself, and it is ACTIVE - the spec requires it be
 * clicked through once, not merely displayed. The two must never be conflated into a
 * single control, since one is informational and the other is a contract.
 *
 * One-time per signed-in user, or per guest browser (see lib/guestSession.ts) - never
 * both. A guest who later creates an account is deliberately NOT carried forward (the
 * spec's own recommendation): their new user_id has no prior acceptance, so this gate
 * fires again under the new identity. That is by design, not a bug to fix later.
 */
export function GrooviaAiTermsGate({
  content,
  busy,
  error,
  onAccept,
  onClose,
}: {
  content: string;
  busy: boolean;
  error: string | null;
  onAccept: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-900/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl bg-card shadow-2xl border border-[--color-border] animate-fade-up">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-brand-500 hover:text-brand-900 hover:bg-brand-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pt-6 sm:px-8 sm:pt-8 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-700 shrink-0">
            <Bot className="h-4 w-4" />
          </span>
          <h2 className="text-lg font-semibold text-brand-900">Before you chat with Groovia</h2>
        </div>

        <p className="px-6 sm:px-8 mt-2 text-sm text-muted leading-relaxed">
          Groovia is an AI assistant. Please review and accept the terms below before sending your
          first message.
        </p>

        <div className="mt-4 px-6 sm:px-8 pb-2 overflow-y-auto border-t border-[--color-border] pt-4">
          <LegalMarkdown content={content} className="text-sm" />
        </div>

        {error && <p className="px-6 sm:px-8 text-sm text-red-600">{error}</p>}

        <div className="px-6 pb-6 pt-4 sm:px-8 sm:pb-8 flex flex-col sm:flex-row gap-2.5">
          <Button variant="ghost" className="sm:flex-1" onClick={onClose}>Not now</Button>
          <Button variant="accent" className="sm:flex-1" loading={busy} onClick={onAccept}>
            Accept and continue
          </Button>
        </div>
      </div>
    </div>
  );
}
