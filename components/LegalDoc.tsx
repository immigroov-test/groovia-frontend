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

// Two-level accordion: audience group → its sections. Nothing renders outside a
// dropdown except the page title, matching the previous site.
export function LegalDoc({ title, updated, groups }: { title: string; updated?: string; groups: LegalGroup[] }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-900 text-center">{title}</h1>
      {updated && <p className="text-sm text-muted mt-2 text-center">{updated}</p>}

      <div className="mt-8 flex flex-col gap-3">
        {groups.map((g) => {
          const { intro, sections } = parse(g.content);
          const groupOpen = openGroup === g.label;
          return (
            <div key={g.label} className="rounded-2xl border border-[--color-border] bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenGroup(groupOpen ? null : g.label)}
                aria-expanded={groupOpen}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-brand-50/50 transition-colors"
              >
                <span className="text-base font-semibold text-brand-900">{g.label}</span>
                <ChevronDown className={cn('h-5 w-5 text-muted shrink-0 transition-transform', groupOpen && 'rotate-180')} />
              </button>

              {groupOpen && (
                <div className="px-4 pb-4 border-t border-[--color-border]">
                  {intro && (
                    <p className="text-xs text-muted whitespace-pre-line leading-relaxed pt-3 pb-1">{intro}</p>
                  )}
                  <div className="mt-3 flex flex-col gap-2">
                    {sections.map((s, i) => {
                      const sid = `${g.label}-${i}`;
                      const sOpen = openSection === sid;
                      return (
                        <div key={sid} className="rounded-xl border border-[--color-border] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setOpenSection(sOpen ? null : sid)}
                            aria-expanded={sOpen}
                            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-brand-50/30 hover:bg-brand-50/70 transition-colors"
                          >
                            <span className="text-sm font-medium text-brand-900">{i + 1}. {s.title}</span>
                            <ChevronDown className={cn('h-4 w-4 text-muted shrink-0 transition-transform', sOpen && 'rotate-180')} />
                          </button>
                          {sOpen && (
                            <div className="px-4 pb-4 pt-3 border-t border-[--color-border] bg-card">
                              <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{s.body}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
