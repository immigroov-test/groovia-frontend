import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import type { Mentor } from '../lib/types';
import { Flag } from './ui/Flag';
import { countryLabel } from '../lib/countries';

function PhotoTile({ mentor, hidden, className = '' }: { mentor: Mentor; hidden: boolean; className?: string }) {
  return (
    <Link href={`/mentors/${mentor.slug}`} tabIndex={hidden ? -1 : undefined}
      className={`group relative block aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-brand-100 shadow-(--shadow-1) ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mentor.photo_url!} alt={hidden ? '' : mentor.display_name} loading="lazy" decoding="async"
        className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-900/85 via-brand-900/35 to-transparent px-3.5 pb-3.5 pt-10 text-white">
        <p className="truncate text-sm font-semibold leading-tight">{mentor.display_name.split(' ')[0]}</p>
        {mentor.country && (
          <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-white/85">
            <Flag code={mentor.country} className="h-2.5 w-[15px] shrink-0 rounded-[2px]" />{countryLabel(mentor.country)}
          </p>
        )}
      </div>
    </Link>
  );
}

// Repeats a short list so one copy is always taller/wider than the visible window; otherwise the
// half-way loop would show an empty gap.
function fill(list: Mentor[], min: number): Mentor[] {
  let out = list;
  while (out.length < min) out = [...out, ...list];
  return out;
}

export function MentorPhotoStrip({ mentors }: { mentors: Mentor[] }) {
  const left = fill(mentors.filter((_, i) => i % 2 === 0), 5);
  const right = fill(mentors.filter((_, i) => i % 2 === 1), 5);
  const row = fill(mentors, 8);

  return (
    <div className="relative">
      {/* Large screens: two columns drifting in opposite directions. */}
      <div className="hidden h-[36rem] grid-cols-2 gap-4 lg:grid">
        {[left, right].map((column, c) => (
          <div key={c} className="marquee-v">
            <div className={`marquee-v-track ${c === 1 ? 'is-reverse' : ''}`} style={{ animationDuration: `${column.length * 13}s` }}>
              {[0, 1].map((copy) => (
                <ul key={copy} aria-hidden={copy === 1 || undefined}>
                  {column.map((m, i) => <li key={`${copy}-${i}-${m.id}`} className="pb-4"><PhotoTile mentor={m} hidden={copy === 1} /></li>)}
                </ul>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Smaller screens: a single sideways row under the headline. */}
      <div className="marquee -mx-5 lg:hidden">
        <div className="marquee-track" style={{ animationDuration: `${row.length * 7}s` }}>
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex" aria-hidden={copy === 1 || undefined}>
              {row.map((m, i) => <li key={`${copy}-${i}-${m.id}`} className="pr-3"><PhotoTile mentor={m} hidden={copy === 1} className="w-36 sm:w-44" /></li>)}
            </ul>
          ))}
        </div>
      </div>

      <div className="absolute -left-8 bottom-12 z-10 hidden items-center gap-3 rounded-2xl border border-(--color-border) bg-white px-4 py-3 shadow-(--shadow-3) lg:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700"><ShieldCheck className="h-5 w-5" /></span>
        <div><p className="text-sm font-semibold text-brand-900">Reviewed before listing</p><p className="text-xs text-muted">Real people who made the move</p></div>
      </div>
    </div>
  );
}
