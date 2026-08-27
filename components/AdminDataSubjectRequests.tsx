'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';

interface DsrRequest {
  id: string; name: string; email: string; request_type: string;
  details: string | null; status: 'open' | 'in_progress' | 'closed'; created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  access: 'Access', rectification: 'Correct', erasure: 'Delete', portability: 'Export', other: 'Other',
};

/** Section 7 admin queue — intake only. Marking a request in_progress/closed here
 * records that it was handled; the actual export/deletion happens outside this table,
 * through whatever operational workflow the team uses. This view does not perform
 * that fulfillment - it is the ticket log, not the deletion executor. */
export function AdminDataSubjectRequests() {
  const [rows, setRows] = useState<DsrRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<'open' | 'in_progress' | 'closed' | 'all'>('open');

  const load = useCallback(async () => {
    setError(null);
    const { ok, data } = await apiFetch<DsrRequest[]>('/api/legal/admin/data-subject-requests');
    if (!ok || !Array.isArray(data)) { setError('Could not load requests.'); return; }
    setRows(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setStatus(r: DsrRequest, status: string) {
    setBusy(r.id);
    try {
      await apiFetch(`/api/legal/admin/data-subject-requests/${r.id}/status`, {
        method: 'POST', json: { status },
      });
      await load();
    } catch { setError('Could not update the request.'); }
    finally { setBusy(null); }
  }

  if (rows === null && !error) return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  const counts = { all: rows?.length ?? 0, open: 0, in_progress: 0, closed: 0 } as Record<string, number>;
  (rows ?? []).forEach((r) => { counts[r.status]++; });
  const shown = (rows ?? []).filter((r) => filter === 'all' || r.status === filter);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Intake only - fulfilling a request (export, correction, deletion) happens outside this table.
        This is the ticket log, so nothing here is silently forgotten.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {(['open', 'in_progress', 'closed', 'all'] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
              filter === f ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-[--color-border] text-muted hover:text-foreground'}`}>
            {f === 'in_progress' ? 'In progress' : f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="text-sm text-muted">Nothing here.</p>}
      {shown.map((r) => (
        <Card key={r.id}><CardBody className="pt-4 pb-4 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{r.name}</span>
            <span className="text-sm text-muted">{r.email}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-900">{TYPE_LABEL[r.request_type] ?? r.request_type}</span>
          </div>
          <p className="text-xs text-muted">{new Date(r.created_at).toLocaleString()}</p>
          {r.details && <p className="text-sm text-foreground/80">{r.details}</p>}
          <div className="flex gap-2">
            {r.status !== 'in_progress' && <Button variant="outline" size="sm" loading={busy === r.id} onClick={() => setStatus(r, 'in_progress')}>Mark in progress</Button>}
            {r.status !== 'closed' && <Button variant="accent" size="sm" loading={busy === r.id} onClick={() => setStatus(r, 'closed')}>Mark closed</Button>}
            {r.status === 'closed' && <Button variant="outline" size="sm" onClick={() => setStatus(r, 'open')}>Reopen</Button>}
          </div>
        </CardBody></Card>
      ))}
    </div>
  );
}
