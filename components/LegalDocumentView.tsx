'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Button } from './ui/Button';
import { LegalMarkdown } from './LegalMarkdown';
import type { UserLegalDocument } from '../app/(shell)/legal/[slug]/page';

function when(ts: string): string {
  return new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

// A published legal document as the user reads it, plus the acknowledgement.
//
// There is no edit affordance and no draft: this component only ever receives a
// published version's content, and the only write it can make is the
// acknowledgement, which records that this user read this exact version.
export function LegalDocumentView({ doc }: { doc: UserLegalDocument }) {
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(doc.acknowledged);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function acknowledge() {
    setBusy(true); setError(null);
    const { ok, data } = await apiFetch<{ detail?: string }>('/api/legal/acknowledge',
      { method: 'POST', json: { version_id: doc.version_id } });
    setBusy(false);
    if (!ok) { setError(data?.detail || 'Could not record that. Please try again.'); return; }
    setAcknowledged(true);
    // Refresh the server components so the update notice, which is rendered from
    // the same pending-updates query, drops this document without a full reload.
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <Link href="/legal"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Legal Documents
      </Link>

      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-brand-900">{doc.title}</h1>
      {doc.summary && <p className="text-sm text-muted mt-2">{doc.summary}</p>}
      <p className="text-xs text-muted/80 mt-2 tabular-nums">
        {doc.version} · Last updated {when(doc.last_updated)} · Applies to {doc.audience_label.toLowerCase()}
      </p>

      <article className="mt-8 rounded-2xl border border-[--color-border] bg-card px-5 py-6 sm:px-7 sm:py-8">
        <LegalMarkdown content={doc.content} />
      </article>

      {/* The acknowledgement sits AFTER the text, not above it: a control to confirm
          you have read something belongs at the end of the thing you read. */}
      <div className="mt-6">
        {acknowledged ? (
          <p className="inline-flex items-center gap-2 text-sm text-emerald-700">
            <Check className="h-4 w-4" /> You reviewed {doc.version} of this document.
          </p>
        ) : (
          <>
            <Button variant="accent" loading={busy} onClick={acknowledge}>
              I have reviewed this document
            </Button>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
