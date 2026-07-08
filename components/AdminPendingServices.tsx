'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Clock } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';

interface PendingService {
  id: string; title: string; description: string | null; type: string;
  duration: number; set_price: number; set_currency: string; mentor_name: string | null;
}

export function AdminPendingServices() {
  const [rows, setRows] = useState<PendingService[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const authedFetch = useCallback(async (url: string, init?: RequestInit) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return fetch(url, { ...init, headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, ...(init?.headers ?? {}) }, cache: 'no-store' });
  }, []);

  const load = useCallback(async () => {
    setError(null); setRows(null);
    try {
      const res = await authedFetch('/api/admin/services/pending');
      if (!res.ok) { setError('Could not load pending services.'); return; }
      setRows(await res.json());
    } catch { setError('Could not load pending services.'); }
  }, [authedFetch]);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: 'approve' | 'reject') {
    setBusy(id);
    try {
      const res = await authedFetch(`/api/admin/services/${id}/${action}`, { method: 'POST' });
      if (res.ok) setRows((rs) => (rs ?? []).filter((r) => r.id !== id));
    } finally { setBusy(null); }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (rows === null) return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (rows.length === 0) return <p className="text-sm text-muted">No services awaiting approval.</p>;

  return (
    <div className="flex flex-col gap-3">
      {rows.map((s) => (
        <Card key={s.id}>
          <CardBody className="pt-5 pb-5 flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
                <span className="inline-flex items-center gap-1 text-xs text-amber-700"><Clock className="h-3 w-3" /> pending</span>
              </div>
              <p className="text-xs text-muted mt-0.5">by {s.mentor_name ?? '-'}</p>
              {s.description && <p className="text-xs text-muted mt-1 max-w-xl">{s.description}</p>}
              <p className="text-xs text-muted mt-1">
                {s.type} · {s.duration} min · {s.set_price === 0 ? 'Free' : `${s.set_price} ${s.set_currency}`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" loading={busy === s.id} onClick={() => act(s.id, 'reject')}>Reject</Button>
              <Button variant="accent" size="sm" loading={busy === s.id} onClick={() => act(s.id, 'approve')}>Approve</Button>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
