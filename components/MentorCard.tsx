import Link from 'next/link';
import { Star, Globe, MapPin, Sparkles } from 'lucide-react';
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

export function MentorCard({ mentor }: { mentor: Mentor }) {
  const initials = mentor.display_name.split(' ').map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();
  const countries = mentor.expertise_country_codes ?? [];
  const categories = mentor.expertise_categories ?? [];
  const languages = mentor.languages ?? [];
  const rating = mentor.avg_rating ?? 0;
  const location = [mentor.city, mentor.country ? countryLabel(mentor.country) : '']
    .filter(Boolean).join(', ');

  return (
    <Card className="h-full flex flex-col hover:border-brand-300 hover:-translate-y-0.5 transition-transform">
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
            <h3 className="text-base font-semibold text-brand-900 break-words">{mentor.display_name}</h3>
            {mentor.headline && <p className="text-sm text-muted mt-0.5 break-words">{mentor.headline}</p>}
            <p className="text-sm font-medium text-amber-600 mt-1 flex items-center gap-1">
              <Star className={`h-3.5 w-3.5 ${rating > 0 ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} />
              {rating > 0 ? rating.toFixed(1) : '0.0'}
              <span className="text-muted font-normal">({mentor.review_count ?? 0})</span>
            </p>
          </div>
        </div>

        {/* Expertise: fair-pricing tag + category tags + countries (full names) */}
        <div className="flex flex-wrap gap-1.5">
          {mentor.smart_pricing && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-xs font-medium">
              <Sparkles className="h-3 w-3" /> Fair pricing
            </span>
          )}
          {categories.slice(0, 3).map((cat) => (
            <Badge key={cat} tone="accent">{EXPERTISE_CATEGORY_MAP[cat] ?? cat}</Badge>
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

        {/* Where the mentor is based */}
        {location && (
          <p className="text-xs text-muted flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {location}
          </p>
        )}

        {/* Footer: starting price + Book */}
        <div className="mt-auto pt-3 border-t border-[--color-border] flex items-center justify-between gap-3">
          {mentor.min_price != null && mentor.min_price > 0 ? (
            <div>
              <p className="text-lg font-bold text-brand-900 leading-tight">
                {money(mentor.min_price, mentor.price_currency ?? 'USD')}
              </p>
              <p className="text-[11px] text-muted">from · per session</p>
            </div>
          ) : (
            <span className="text-sm text-muted">Free intro</span>
          )}
          <Link href={`/mentors/${mentor.slug}`}
            className="inline-flex items-center gap-1 h-9 px-4 rounded-lg bg-accent-500 text-white text-sm font-semibold hover:bg-accent-600 transition-colors shrink-0">
            Book →
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
