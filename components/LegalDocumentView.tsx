import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LegalMarkdown, legalHeadings } from './LegalMarkdown';
import type { UserLegalDocument } from '../app/(shell)/legal/[slug]/page';

function when(ts: string): string {
  return new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

// A published legal document as the user reads it. Read-only, and deliberately so.
//
// It used to carry an "I have reviewed this document" button, which made every policy an
// outstanding task for anyone who signed in. Consent is taken once at sign-in and again at
// checkout, where the person is actually agreeing to something; turning the reference copy
// into a chore repeated the ask without adding any legal weight. With no writes left this
// is a server component, so reading a policy no longer ships any JavaScript.
export function LegalDocumentView({ doc }: { doc: UserLegalDocument }) {
  const headings = legalHeadings(doc.content);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <Link href="/legal"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Terms &amp; Policies
      </Link>

      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-brand-900">{doc.title}</h1>
      {doc.summary && <p className="text-sm text-muted mt-2">{doc.summary}</p>}
      <p className="text-xs text-muted/80 mt-2 tabular-nums">
        {doc.version} · Last updated {when(doc.last_updated)} · Applies to {doc.audience_label.toLowerCase()}
      </p>

      {/* Contents, for the documents long enough that finding a clause by scrolling is the
          actual difficulty. Under four sections it is noise. */}
      {headings.length >= 4 && (
        <nav aria-label={`Contents of ${doc.title}`}
          className="mt-6 rounded-xl border border-[--color-border] bg-brand-50/40 px-4 py-3">
          <p className="text-xs font-medium text-brand-900">On this page</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {headings.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`} className="text-xs text-muted hover:text-brand-700 hover:underline">
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <article className="mt-6 rounded-2xl border border-[--color-border] bg-card px-5 py-6 sm:px-7 sm:py-8">
        <LegalMarkdown content={doc.content} />
      </article>
    </div>
  );
}
