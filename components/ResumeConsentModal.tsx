'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FileText, X } from 'lucide-react';
import { Button } from './ui/Button';
import { UI_CONTENT } from '../lib/content';

/** Consent before a resume is analysed by AI (BUG-143).
 *
 * A resume can be attached two ways: through the career-report flow, which has its own consent box,
 * and straight from Groovia's "attach your resume" greeting in normal chat. This covers the second
 * path, which otherwise reached the upload having agreed to nothing.
 *
 * Separate from cookie consent on purpose. Agreeing to cookies is not agreeing to have your CV read
 * by a model, and this is the moment the person actually decides.
 */
export function ResumeConsentModal({
  fileName,
  onAgree,
  onCancel,
}: {
  fileName: string;
  onAgree: () => void;
  onCancel: () => void;
}) {
  const r = UI_CONTENT.report;
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-900/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onCancel} aria-hidden />

      <div className="relative w-full max-w-md rounded-3xl bg-card shadow-2xl border border-[--color-border] p-6 sm:p-8 animate-fade-up">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-brand-500 hover:text-brand-900 hover:bg-brand-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-700 shrink-0">
            <FileText className="h-4 w-4" />
          </span>
          <h2 className="text-lg font-semibold text-brand-900">Before we read your resume</h2>
        </div>

        <p className="mt-3 text-sm text-muted leading-relaxed break-words">
          You&apos;re attaching <span className="font-medium text-foreground">{fileName}</span>.
        </p>

        <label className="mt-5 flex items-start gap-2.5 cursor-pointer">
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

        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <Button variant="ghost" className="sm:flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant="accent" className="sm:flex-1" disabled={!agreed} onClick={onAgree}>
            Agree and upload
          </Button>
        </div>
      </div>
    </div>
  );
}
