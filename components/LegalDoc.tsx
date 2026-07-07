'use client';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export interface LegalGroup { label: string; content: string }

// Split a document on "## " headings. Text before the first heading is the intro.
function parse(md: string): { intro: string; sections: { title: string; body: string }[] } {
  const parts = md.split(/^##[ \t]+/m);
  const intro = parts[0].trim();
  const sections = parts.slice(1).map((p) => {
    const nl = p.indexOf('\n');
    const title = (nl === -1 ? p : p.slice(0, nl)).trim();
    const body = (nl === -1 ? '' : p.slice(nl + 1)).trim();
    return { title, body };
  });
  return { intro, sections };
}

export function LegalDoc({ title, updated, groups }: { title: string; updated?: string; groups: LegalGroup[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-900 text-center">{title}</h1>
      {updated && <p className="text-sm text-muted mt-2 text-center">{updated}</p>}

      {groups.map((g) => {
        const { intro, sections } = parse(g.content);
        return (
          <section key={g.label} className="mt-10">
            <h2 className="text-xl font-semibold text-brand-700">{g.label}</h2>
            {intro && <p className="mt-2 text-sm text-muted whitespace-pre-line leading-relaxed">{intro}</p>}

            <div className="mt-4 flex flex-col gap-2">
              {sections.map((s, i) => {
                const id = `${g.label}-${i}`;
                const isOpen = open === id;
                return (
                  <div key={id} className="rounded-xl border border-[--color-border] bg-card overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : id)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-brand-50/50 transition-colors"
                    >
                      <span className="text-sm font-medium text-brand-900">{i + 1}. {s.title}</span>
                      <ChevronDown className={cn('h-4 w-4 text-muted shrink-0 transition-transform', isOpen && 'rotate-180')} />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-3 border-t border-[--color-border]">
                        <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{s.body}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
