'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Button } from './ui/Button';
import { LegalMarkdown } from './LegalMarkdown';
import { cn } from '../lib/utils';

export interface PendingLegalDocument {
  document_id: string;
  code: string;
  slug: string;
  title: string;
  summary: string | null;
  audience: string;
  audience_label: string;
  version_id: string;
  version: string;
  last_updated: string;
  content: string;
}

function when(ts: string): string {
  return new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

// The bundled review page a user lands on from "Legal document updated": every
// document that applies to them and is not yet acknowledged, in one place, behind
// one button.
//
// This is the fix for asking a customer to click through nine separate documents.
// The Bundling Guide already prescribes one acceptance click per bundle at signup;
// this generalizes the same idea to a later update - one click covers whatever is
// currently pending, however many documents that is. The button still writes one
// timestamped row per document (legal_acknowledge_all does, server-side), so a
// dispute over any single document still has its own precise record - the user
// clicked once, but the database did not merge the nine agreements into one.
export function LegalUpdatesReview({ docs }: { docs: PendingLegalDocument[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(docs[0]?.slug ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function acknowledgeAll() {
    setBusy(true); setError(null);
    const { ok, data } = await apiFetch<{ detail?: string }>('/api/legal/acknowledge-all', { method: 'POST' });
    setBusy(false);
    if (!ok) { setError(data?.detail || 'Could not record that. Please try again.'); return; }
    router.push('/legal');
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 pb-32">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-900">Legal documents updated</h1>
      <p className="text-sm text-muted mt-2">
        {docs.length === 1
          ? 'The following document has been updated. Please review it below.'
          : `The following ${docs.length} documents have been updated. Please review them below.`}
      </p>

      <div className="mt-8 flex flex-col gap-2">
        {docs.map((d) => {
          const isOpen = open === d.slug;
          return (
            <div key={d.document_id} className="rounded-2xl border border-[--color-border] bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : d.slug)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-brand-50/50 transition-colors"
              >
                <span className="min-w-0">
                  <span className="block font-medium text-brand-900">{d.title}</span>
                  <span className="block text-xs text-muted mt-0.5 tabular-nums">
                    {d.version} · Last updated {when(d.last_updated)}
                  </span>
                </span>
                <ChevronDown className={cn('h-5 w-5 text-muted shrink-0 transition-transform', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <div className="px-5 pb-6 pt-1 border-t border-[--color-border]">
                  {d.summary && <p className="text-sm text-muted mt-3 mb-4">{d.summary}</p>}
                  <LegalMarkdown content={d.content} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fixed to the bottom rather than inline after the list, so the single action
          that clears every pending document is reachable without scrolling back down
          through documents the user has already opened and closed. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[--color-border] bg-card/95 backdrop-blur-md px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-3xl flex flex-wrap items-center gap-3">
          <Button variant="accent" loading={busy} onClick={acknowledgeAll}>
            <Check className="h-4 w-4" />
            {docs.length === 1 ? 'I have reviewed this document' : `I have reviewed these ${docs.length} documents`}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
