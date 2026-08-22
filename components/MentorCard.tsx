import Link from 'next/link';
import { Star, Globe, MapPin, Sparkles, Gift } from 'lucide-react';
import { Card, CardBody } from './ui/Card';
import { Badge } from './ui/Badge';
import { EXPERTISE_CATEGORY_MAP } from '../lib/content';
import { countryLabel } from '../lib/countries';
import { languageLabel } from '../lib/languages';
import type { Mentor } from '../lib/types';

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

interface DisplayPrice { original: number; discounted: number; currency: string }

export function MentorCard({ mentor, price, priceReady = true }: { mentor: Mentor; price?: DisplayPrice; priceReady?: boolean }) {
  const initials = mentor.display_name.split(' ').map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();
  const countries = mentor.expertise_country_codes ?? [];
  // Show what the mentor helps with = their configured session categories (already readable). Fall
  // back to the legacy self-declared expertise categories for mentors who have none yet. Map every
  // value through EXPERTISE_CATEGORY_MAP so a stray raw code (e.g. 'job_career') never renders raw.
  const rawCats = (mentor.service_categories && mentor.service_categories.length)
    ? mentor.service_categories
    : (mentor.expertise_categories ?? []);
  const categories = rawCats.map((c) => EXPERTISE_CATEGORY_MAP[c] ?? c);
  const languages = mentor.languages ?? [];
  const rating = mentor.avg_rating ?? 0;
  const location = [mentor.city, mentor.country ? countryLabel(mentor.country) : '']
    .filter(Boolean).join(', ');
  const homeLabel = mentor.home_country_code ? countryLabel(mentor.home_country_code) : '';
  // One place line instead of two muted rows: "Amsterdam, Netherlands · from India".
  const placeLine = [location, homeLabel ? `from ${homeLabel}` : ''].filter(Boolean).join('  ·  ');
  // Strike the original ONLY when fair pricing made the price LOWER (a real discount). Equal at
  // display precision -> no strike ("€24 -> €24" is noise); higher -> show just the final price
  // (a cheaper struck-out figure beside a higher charge reads as a markup, not a deal).
  const showStrike = !!price && price.discounted < price.original
    && money(price.original, price.currency) !== money(price.discounted, price.currency);

  return (
    <Card className="group relative h-full flex flex-col hover:border-brand-300 hover:-translate-y-0.5 transition-transform">
      {/* FEAT-036: the whole card opens the mentor's profile, not just Book. The link is STRETCHED
          over the card rather than wrapped around it - wrapping would put the Book anchor inside
          another anchor, which is invalid - and Book itself becomes presentational, so the card
          still exposes exactly one link instead of two pointing at the same profile. Book keeps its
          hover colour via group-hover, since the pointer is over this overlay and never over Book. */}
      <Link href={`/mentors/${mentor.slug}`}
        aria-label={`View ${mentor.display_name}'s profile and book a session`}
        className="absolute inset-0 z-10 rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2" />
      <CardBody className="pt-6 flex flex-col gap-4 h-full">
        {/* Identity: photo · name / title / rating */}
        <div className="flex items-start gap-3">
          {mentor.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mentor.photo_url} alt={mentor.display_name} className="h-20 w-20 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-brand-700 to-accent-500 flex items-center justify-center text-white text-lg font-semibold shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-baseline gap-x-2 gap-y-0.5 flex-wrap">
              <h3 className="text-base font-semibold text-brand-900 break-words">{mentor.display_name}</h3>
              {rating > 0 && (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 shrink-0">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {rating.toFixed(1)}
                  <span className="text-muted font-normal">({mentor.review_count ?? 0})</span>
                </span>
              )}
            </div>
            {mentor.headline && <p className="text-sm text-muted mt-0.5 break-words">{mentor.headline}</p>}
          </div>
        </div>

        {/* Expertise: category tags + countries (full names). Fair-pricing badge lives by the price. */}
        <div className="flex flex-wrap gap-1.5">
          {categories.slice(0, 3).map((cat) => (
            <Badge key={cat} tone="accent">{cat}</Badge>
          ))}
          {countries.slice(0, 2).map((c) => (
            <Badge key={c} tone="brand">{countryLabel(c)}</Badge>
          ))}
        </div>

        {/* Languages (full names) */}
        {languages.length > 0 && (
          <p className="text-xs text-muted flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            {languages.map((l) => languageLabel(l)).join(', ')}
          </p>
        )}

        {/* Where the mentor is based + their origin, on a single line */}
        {placeLine && (
          <p className="text-xs text-muted flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="break-words">{placeLine}</span>
          </p>
        )}

        {/* Footer: starting price + Book */}
        <div className="mt-auto pt-3 border-t border-[--color-border] flex items-end justify-between gap-3">
          <div className="min-w-0">
            {mentor.min_price != null && mentor.min_price > 0 ? (
              !priceReady ? (
                // Wait for the backend-localized price so we never flash the raw mentor currency.
                <div className="h-6 w-28 rounded bg-neutral-100 animate-pulse" aria-hidden />
              ) : (
                <>
                  {/* Reads as "from <cost> per session"; the cheapest PAID session, never the free one. */}
                  <p className="leading-tight flex flex-wrap items-baseline gap-x-1">
                    <span className="text-[11px] text-muted">from</span>
                    {showStrike && price && (
                      <span className="text-sm text-muted line-through">{money(price.original, price.currency)}</span>
                    )}
                    <span className="text-lg font-bold text-brand-900">
                      {price ? money(price.discounted, price.currency) : money(mentor.min_price, mentor.price_currency ?? 'USD')}
                    </span>
                    <span className="text-[11px] text-muted">per session</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    {mentor.smart_pricing && showStrike && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                        <Sparkles className="h-3 w-3" /> Fair pricing
                      </span>
                    )}
                    {mentor.has_free_session && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <Gift className="h-3 w-3" /> Free intro call
                      </span>
                    )}
                  </div>
                </>
              )
            ) : (
              // No paid session priced: only a free intro (or nothing bookable-paid yet).
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                <Gift className="h-4 w-4" /> Free intro call
              </span>
            )}
          </div>
          <span aria-hidden="true"
            className="inline-flex items-center gap-1 h-9 px-4 rounded-lg bg-accent-500 text-white text-sm font-semibold group-hover:bg-accent-600 transition-colors shrink-0">
            Book →
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
