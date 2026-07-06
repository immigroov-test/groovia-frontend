'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Card, CardBody } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface StrikeRow {
  id: string; display_name: string; slug: string; status: string;
  no_show_strikes: number; last_no_show_at: string | null;
}

export function AdminOps() {
  const [rows, setRows] = useState<StrikeRow[] | null>(null);
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
      const res = await authedFetch('/api/admin/no-show-strikes');
      if (!res.ok) { setError('Could not load the ops queue.'); return; }
      setRows(await res.json());
    } catch { setError('Could not load the ops queue.'); }
  }, [authedFetch]);

  useEffect(() => { load(); }, [load]);

  async function reset(id: string) {
    setBusy(id);
    try {
      const res = await authedFetch(`/api/admin/mentors/${id}/reset-strikes`, { method: 'POST' });
      if (res.ok) setRows((rs) => (rs ?? []).filter((r) => r.id !== id));
    } finally { setBusy(null); }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-[--color-border] bg-brand-50/40 p-4 text-xs text-muted leading-relaxed">
        <p className="font-medium text-foreground mb-1">No-show strike ladder</p>
        Strike 1–2 → warning only. Strike 3+ → 25% mentor-payout penalty per no-show. Counter resets automatically after 90 days.
        Reset a mentor&apos;s strikes here if a dispute is resolved in their favour.
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {rows === null ? (
        <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">No mentors with active no-show strikes. 🎉</p>
      ) : (
        rows.map((m) => (
          <Card key={m.id}>
            <CardBody className="pt-5 pb-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-9 w-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                  <ShieldAlert className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{m.display_name}</p>
                    <Badge tone={m.no_show_strikes >= 3 ? 'warning' : 'neutral'}>{m.no_show_strikes} strike{m.no_show_strikes !== 1 ? 's' : ''}</Badge>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {m.status} · last no-show {m.last_no_show_at ? new Date(m.last_no_show_at).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" loading={busy === m.id} onClick={() => reset(m.id)}>
                Reset strikes
              </Button>
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );
}
