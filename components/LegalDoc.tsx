'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';

// Renders a legal document (Terms / Privacy) with a Customer / Mentor toggle.
// Content is plain Markdown passed in from the server page.
export function LegalDoc({ title, updated, customer, mentor }: {
  title: string;
  updated?: string;
  customer: string;
  mentor: string;
}) {
  const [aud, setAud] = useState<'customer' | 'mentor'>('customer');
  const content = aud === 'customer' ? customer : mentor;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-900">{title}</h1>
      {updated && <p className="text-sm text-muted mt-2">{updated}</p>}

      <div className="mt-6 inline-flex items-center gap-1 rounded-full bg-brand-50 p-1">
        {(['customer', 'mentor'] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAud(a)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
              aud === a ? 'bg-white shadow-sm text-brand-900' : 'text-muted hover:text-foreground',
            )}
          >
            {a === 'customer' ? 'For customers' : 'For mentors'}
          </button>
        ))}
      </div>

      <article className="mt-6 prose prose-sm max-w-none prose-headings:text-brand-900 prose-headings:font-semibold prose-a:text-brand-700 prose-strong:text-brand-900">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </article>
    </div>
  );
}
