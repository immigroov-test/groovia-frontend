'use client';
import { useState } from 'react';
import { Share2, Check } from 'lucide-react';

// One share control for anything with a public URL. Mentor profiles use it today; session pages and
// the browse cards can reuse it rather than each growing their own.
//
// Two behaviours, because the platforms differ. On a phone, navigator.share opens the OS share sheet,
// which is the only route to WhatsApp, Instagram and the rest - a web page cannot post to those
// directly. On desktop that API is mostly absent, so it falls back to copying the link, which is what
// someone on a laptop was going to do by hand anyway.
export interface ShareButtonProps {
  /** Absolute URL to share. Relative paths break in the OS share sheet and in pasted messages. */
  url: string;
  title: string;
  /** Sent to the share sheet as the message body. Ignored by the copy fallback. */
  text?: string;
  label?: string;
  className?: string;
}

export function ShareButton({ url, title, text, label = 'Share', className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function share() {
    // Feature-detect rather than sniff the user agent: some desktop browsers do support this, and
    // some mobile ones do not.
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // Dismissing the sheet rejects too, so fall through to copying rather than showing an error
        // for something the user did on purpose.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard needs a secure context and can be blocked. Selecting the text is the last resort
      // that always works.
      window.prompt('Copy this link:', url);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={`${label}: ${title}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium
        text-brand-700 hover:text-brand-900 hover:bg-brand-50 transition-colors
        shadow-[0_0_0_1px_rgba(15,23,42,0.08)] ${className}`}
    >
      {copied
        ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> Link copied</>
        : <><Share2 className="h-3.5 w-3.5" /> {label}</>}
    </button>
  );
}
