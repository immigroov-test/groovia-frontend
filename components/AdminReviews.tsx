'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Calendar, Clock } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';
import { RichText } from './ui/RichText';
import { ReviewStars } from './Reviews';

interface AdminReview {
  id: string; rating: number; body: string | null; reviewer_name: string | null;
  knowledge: number | null; communication: number | null; helpfulness: number | null;
  mentor_id: string; mentor_name: string | null;
  mentee_name: string | null; mentee_email: string | null;
  booking_id: string; slot_time: string | null; slot_end: string | null;
  duration: number | null; service_title: string | null;
  status: 'pending' | 'published' | 'rejected'; created_at: string;
}

const STATUS: Record<string, [string, string]> = {
  pending: ['Pending', 'bg-amber-50 text-amber-700'],
  published: ['Published', 'bg-green-50 text-green-700'],
  rejected: ['Rejected', 'bg-red-50 text-red-600'],
};

export function AdminReviews() {
  const [rows, setRows] = useState<AdminReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'published' | 'rejected'>('pending');

  const authedFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data: { session } } = await createClient().auth.getSession();
    return fetch(url, { ...init, headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, ...(init?.headers ?? {}) }, cache: 'no-store' });
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await authedFetch('/api/reviews/admin');
      if (!res.ok) { setError('Could not load reviews.'); return; }
      setRows(await res.json());
    } catch { setError('Could not load reviews.'); }
  }, [authedFetch]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(r: AdminReview, status: string) {
    setBusy(r.id);
    try {
      await authedFetch(`/api/reviews/admin/${r.id}/status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      await load();
    } catch { setError('Could not update the review.'); }
    finally { setBusy(null); }
  }

  if (rows === null && !error) return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  const counts = { all: rows?.length ?? 0, pending: 0, published: 0, rejected: 0 } as Record<string, number>;
  (rows ?? []).forEach((r) => { counts[r.status]++; });
  const shown = (rows ?? []).filter((r) => filter === 'all' || r.status === filter);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">A review stays hidden until you publish it. Publishing counts it toward the mentor&apos;s rating; rejecting keeps it hidden.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {(['pending', 'published', 'rejected', 'all'] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
              filter === f ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-[--color-border] text-muted hover:text-foreground'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="text-sm text-muted">Nothing here.</p>}
      {shown.map((r) => (
        <Card key={r.id}><CardBody className="pt-4 pb-4 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <ReviewStars rating={r.rating} />
            <span className="text-sm text-muted">for</span>
            <span className="text-sm font-medium text-foreground">{r.mentor_name || 'Mentor'}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS[r.status]?.[1] || ''}`}>{STATUS[r.status]?.[0] || r.status}</span>
          </div>

          {/* Meeting + parties */}
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {r.slot_time ? new Date(r.slot_time).toLocaleString() : '-'}</span>
            {r.duration != null && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {r.duration} min</span>}
            {r.service_title && <span>{r.service_title}</span>}
            <span>Mentee: <span className="text-foreground">{r.mentee_name || r.mentee_email || 'Member'}</span>{r.mentee_email && r.mentee_name ? ` (${r.mentee_email})` : ''}</span>
          </div>

          {/* Sub-ratings */}
          {(r.knowledge || r.communication || r.helpfulness) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              {r.knowledge != null && <span className="inline-flex items-center gap-1">Knowledge <ReviewStars rating={r.knowledge} size={11} /></span>}
              {r.communication != null && <span className="inline-flex items-center gap-1">Communication <ReviewStars rating={r.communication} size={11} /></span>}
              {r.helpfulness != null && <span className="inline-flex items-center gap-1">Helpfulness <ReviewStars rating={r.helpfulness} size={11} /></span>}
            </div>
          )}

          {r.body && <RichText html={r.body} />}

          <div className="flex gap-2">
            {r.status !== 'published' && <Button variant="accent" size="sm" loading={busy === r.id} onClick={() => setStatus(r, 'published')}>Publish</Button>}
            {r.status !== 'rejected' && <Button variant="outline" size="sm" loading={busy === r.id} onClick={() => setStatus(r, 'rejected')}>Reject</Button>}
            {r.status === 'published' && <Button variant="outline" size="sm" onClick={() => setStatus(r, 'pending')}>Unpublish</Button>}
          </div>
        </CardBody></Card>
      ))}
    </div>
  );
}
