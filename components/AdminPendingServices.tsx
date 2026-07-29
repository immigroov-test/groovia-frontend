'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';

interface PendingService {
  id: string; title: string; description: string | null; type: string; duration: number;
  set_price: number | null; set_currency: string | null; created_at: string;
  mentor_id: string; mentor_name: string | null;
}

function money(amount?: number | null, currency?: string | null): string {
  if (amount == null) return '';
  if (amount === 0) return 'Free';
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(amount); }
  catch { return `${amount} ${currency || ''}`.trim(); }
}

// Session types an already-approved mentor added after going live (status='pending'). Without this
// surface those services were invisible to the admin and never went live. Approve/reject flips the
// service status; browse only shows approved ones.
export function AdminPendingServices() {
  const router = useRouter();
  const [rows, setRows] = useState<PendingService[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const authedFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data: { session } } = await createClient().auth.getSession();
    return fetch(url, { ...init, headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, ...(init?.headers ?? {}) }, cache: 'no-store' });
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await authedFetch('/api/admin/services/pending');
      if (!res.ok) { setError('Could not load pending session types.'); return; }
      setRows(await res.json());
    } catch { setError('Could not load pending session types.'); }
  }, [authedFetch]);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: 'approve' | 'reject') {
    setBusy(id);
    try {
      const res = await authedFetch(`/api/admin/services/${id}/${action}`, { method: 'POST' });
      if (res.ok) {
        setRows((rs) => (rs ?? []).filter((r) => r.id !== id));
        router.refresh();   // keep the stat card + review count in sync
      }
    } finally { setBusy(null); }
  }

  if (rows === null) return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (rows.length === 0) return <p className="text-sm text-muted">No session types awaiting review.</p>;

  return (
    <div className="flex flex-col gap-3">
      {rows.map((s) => (
        <Card key={s.id}>
          <CardBody className="pt-5 pb-5 flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <span className="text-xs text-muted">{s.duration} min · {money(s.set_price, s.set_currency)}</span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                by {s.mentor_name ?? 'a mentor'} · added {new Date(s.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" loading={busy === s.id} onClick={() => act(s.id, 'reject')}>Reject</Button>
              <Button variant="accent" size="sm" loading={busy === s.id} onClick={() => act(s.id, 'approve')}>Approve</Button>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
