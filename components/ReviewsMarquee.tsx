import { Star, ArrowRight } from 'lucide-react';
import { Flag } from './ui/Flag';
import { countryLabel } from '../lib/countries';
import { SESSION_REVIEWS, REVIEW_AVERAGE, type SessionReview } from '../lib/content/reviews';

function ReviewCard({ review }: { review: SessionReview }) {
  return (
    <figure className="flex h-full w-[20rem] sm:w-[23rem] flex-col rounded-[1.25rem] border border-(--color-border) bg-white p-6 shadow-(--shadow-1)">
      <div className="flex items-center gap-0.5" aria-label={`${review.rating} out of 5`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={i < review.rating ? 'h-4 w-4 fill-amber-400 text-amber-400' : 'h-4 w-4 fill-brand-100 text-brand-100'} />
        ))}
      </div>
      <blockquote className="mt-4 flex-1 text-[15px] leading-7 text-foreground">“{review.quote}”</blockquote>
      <figcaption className="mt-5 border-t border-(--color-border) pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate font-semibold text-brand-900">{review.name}</p>
          <p className="shrink-0 text-xs text-muted">{review.date}</p>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
          <Flag code={review.from} className="h-3 w-[18px] rounded-[2px]" />
          <ArrowRight className="h-3.5 w-3.5" aria-label="to" />
          <Flag code={review.to} className="h-3 w-[18px] rounded-[2px]" />
          <span>{countryLabel(review.to)}</span>
        </p>
        <span className="mt-3 inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">{review.topic}</span>
      </figcaption>
    </figure>
  );
}

export function ReviewsMarquee() {
  return (
    <section className="border-y border-(--color-border) bg-white py-20">
      <div className="container-public flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-accent-700">After the session</p>
          <h2 className="font-display mt-3 text-3xl font-bold text-brand-900">What people say about their mentor sessions</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-display text-4xl font-bold text-brand-900">{REVIEW_AVERAGE.toFixed(1)}</span>
          <div>
            <div className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}</div>
            <p className="mt-1 text-sm text-muted">from {SESSION_REVIEWS.length} session reviews</p>
          </div>
        </div>
      </div>

      <div className="marquee mt-10" tabIndex={0} aria-label="Session reviews">
        <div className="marquee-track" style={{ animationDuration: `${SESSION_REVIEWS.length * 16}s` }}>
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex" aria-hidden={copy === 1 || undefined}>
              {SESSION_REVIEWS.map((review) => (
                <li key={`${copy}-${review.name}-${review.date}`} className="pr-5">
                  <ReviewCard review={review} />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
