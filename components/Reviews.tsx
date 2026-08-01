'use client';
import { useCallback, useEffect, useState } from 'react';
import { Star, Loader2, BadgeCheck } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Button } from './ui/Button';
import { RichText } from './ui/RichText';
import { RichTextEditor } from './ui/RichTextEditor';

export interface Review {
  id: string; rating: number; body: string | null; reviewer_name: string | null;
  knowledge: number | null; communication: number | null; helpfulness: number | null;
  created_at: string; verified?: boolean;
}
interface Summary {
  avg: number; count: number;
  distribution: Record<string, number>;
  knowledge: number | null; communication: number | null; helpfulness: number | null;
}

// Read-only star row.
export function ReviewStars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} width={size} height={size}
          className={i <= Math.round(rating) ? 'text-amber-500 fill-amber-500' : 'text-slate-300'} />
      ))}
    </span>
  );
}

// Interactive star picker (overall + sub-ratings).
function StarPicker({ value, onChange, label }: { value: number; onChange: (v: number) => void; label?: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-sm text-muted w-32 shrink-0">{label}</span>}
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onMouseEnter={() => setHover(i)} onClick={() => onChange(i)} aria-label={`${i} stars`}>
            <Star width={24} height={24} className={i <= (hover || value) ? 'text-amber-500 fill-amber-500' : 'text-slate-300'} />
          </button>
        ))}
      </div>
    </div>
  );
}

function useAuthedFetch() {
  return useCallback(async (url: string, init?: RequestInit) => {
    const { data: { session } } = await createClient().auth.getSession();
    return fetch(url, { ...init, headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, ...(init?.headers ?? {}) }, cache: 'no-store' });
  }, []);
}

// Mentee's rating + rich-text review for a completed session. Prefills an existing review.
export function ReviewForm({ bookingId, onDone }: { bookingId: string; onDone?: () => void }) {
  const [rating, setRating] = useState(0);
  const [knowledge, setKnowledge] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [helpfulness, setHelpfulness] = useState(0);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authedFetch = useAuthedFetch();

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch(`/api/reviews/my/${bookingId}`);
        const d = await res.json().catch(() => ({}));
        if (d && d.rating) {
          setRating(d.rating); setBody(d.body || '');
          setKnowledge(d.rating_knowledge || 0); setCommunication(d.rating_communication || 0); setHelpfulness(d.rating_helpfulness || 0);
        }
      } catch { /* first-time review */ }
      finally { setLoaded(true); }
    })();
  }, [authedFetch, bookingId]);

  async function submit() {
    if (rating < 1) { setError('Please pick an overall star rating.'); return; }
    setSaving(true); setError(null);
    try {
      const res = await authedFetch('/api/reviews', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId, rating, body: body.trim() || undefined,
          knowledge: knowledge || undefined, communication: communication || undefined, helpfulness: helpfulness || undefined,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.detail || 'Could not save your review.'); return; }
      setDone(true); onDone?.();
    } catch { setError('Could not save your review.'); }
    finally { setSaving(false); }
  }

  if (!loaded) return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (done) return <p className="text-sm text-green-700">Thanks! Your review was submitted and will appear on the mentor&apos;s profile once it&apos;s approved.</p>;

  return (
    <div className="flex flex-col gap-4">
      <StarPicker value={rating} onChange={setRating} label="Overall" />
      <div className="flex flex-col gap-2">
        <StarPicker value={knowledge} onChange={setKnowledge} label="Knowledge" />
        <StarPicker value={communication} onChange={setCommunication} label="Communication" />
        <StarPicker value={helpfulness} onChange={setHelpfulness} label="Helpfulness" />
      </div>
      <RichTextEditor value={body} onChange={setBody} placeholder="Share how the session went (optional)" maxChars={2000} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div><Button variant="accent" size="sm" loading={saving} onClick={submit}>Submit review</Button></div>
    </div>
  );
}

function SubBadges({ r }: { r: Review }) {
  const items: [string, number | null][] = [['Knowledge', r.knowledge], ['Communication', r.communication], ['Helpfulness', r.helpfulness]];
  const shown = items.filter(([, v]) => v != null);
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
      {shown.map(([k, v]) => (
        <span key={k} className="text-xs text-muted inline-flex items-center gap-1">{k} <ReviewStars rating={v as number} size={11} /></span>
      ))}
    </div>
  );
}

// Public: a mentor's rating summary (distribution bars + sub-averages) + the list of reviews.
export function ReviewsList({ mentorId }: { mentorId: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [rRes, sRes] = await Promise.all([
          fetch(`/api/reviews/mentor/${mentorId}`, { cache: 'no-store' }),
          fetch(`/api/reviews/mentor/${mentorId}/summary`, { cache: 'no-store' }),
        ]);
        setReviews(rRes.ok ? await rRes.json() : []);
        setSummary(sRes.ok ? await sRes.json() : null);
      } catch { setReviews([]); }
    })();
  }, [mentorId]);

  if (reviews === null) return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading reviews…</div>;
  if (reviews.length === 0) return <p className="text-sm text-muted">No reviews yet.</p>;

  const total = summary?.count || reviews.length;

  return (
    <div className="flex flex-col gap-6">
      {summary && summary.count > 0 && (
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-foreground">{Number(summary.avg).toFixed(1)}</span>
            <ReviewStars rating={summary.avg} />
            <span className="text-xs text-muted mt-1">{summary.count} review{summary.count === 1 ? '' : 's'}</span>
          </div>
          <div className="flex-1 flex flex-col gap-1 justify-center min-w-[180px]">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = summary.distribution?.[String(star)] || 0;
              const pct = total ? Math.round((n / total) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs text-muted">
                  <span className="w-3 text-right">{star}</span>
                  <Star width={12} height={12} className="text-amber-500 fill-amber-500 shrink-0" />
                  <span className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden"><span className="block h-full bg-amber-400" style={{ width: `${pct}%` }} /></span>
                  <span className="w-6 text-right">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {reviews.map((r) => (
          <div key={r.id} className="border-b border-[--color-border]/60 pb-4 last:border-0">
            <div className="flex flex-wrap items-center gap-2">
              <ReviewStars rating={r.rating} />
              <span className="text-sm font-medium text-foreground">{r.reviewer_name || 'Member'}</span>
              {r.verified && <span className="inline-flex items-center gap-1 text-xs text-green-700"><BadgeCheck className="h-3.5 w-3.5" /> Verified session</span>}
              <span className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            {r.body && <RichText html={r.body} className="mt-1.5" />}
            <SubBadges r={r} />
          </div>
        ))}
      </div>
    </div>
  );
}
