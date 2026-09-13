'use client';
import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, Search } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Badge } from './ui/Badge';
import { cn } from '../lib/utils';

// BUG-162: the Immigroov bug board, inside the admin dashboard.
//
// The board is a separate Supabase project; the backend owns its credentials and this only ever
// talks to /api/admin/bugs. An unconfigured board is a normal deployment state (local dev, a fresh
// staging box), so it renders as a "not set up" panel rather than an error.

interface Bug {
  id: string;
  ref_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  issue_type: string;
  reported_by: string | null;
  handled_by: string | null;
  tags: string[] | null;
  screenshot_urls: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

// The board's own columns and labels, copied verbatim from immigroov-bug-board lib/types.ts
// (BUG_STATUSES / STATUS_LABELS) so the two tools never disagree about what a column is called.
const COLUMNS: [string, string][] = [
  ['yet_to_review', 'Yet to Review'],
  ['in_progress', 'In Progress'],
  ['to_be_tested', 'To Be Tested'],
  ['completed', 'Completed'],
];

const PRIORITY_TONE: Record<string, 'warning' | 'accent' | 'neutral'> = {
  high: 'warning', medium: 'accent', low: 'neutral',
};

function fmt(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function AdminBugBoard() {
  const [bugs, setBugs] = useState<Bug[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [column, setColumn] = useState('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const authedFetch = useCallback(async (url: string, method = 'GET', body?: object) => {
    const { data: { session } } = await createClient().auth.getSession();
    return fetch(url, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch('/api/admin/bugs');
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) { setError(data.detail || 'Could not load the bug board.'); setBugs([]); return; }
        setConfigured(data.configured !== false);
        setBugs(data.bugs ?? []);
      } catch {
        if (!cancelled) { setError('Could not load the bug board.'); setBugs([]); }
      }
    })();
    return () => { cancelled = true; };
  }, [authedFetch]);

  async function move(bug: Bug, status: string) {
    if (status === bug.status) return;
    setSavingId(bug.id); setError(null);
    // Optimistic: the board is a working tool, and a round trip per drag makes it feel broken.
    const previous = bug.status;
    setBugs((cur) => (cur ?? []).map((b) => (b.id === bug.id ? { ...b, status } : b)));
    try {
      const res = await authedFetch(`/api/admin/bugs/${bug.id}/status`, 'POST', { status });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || 'Could not update that item.');
        setBugs((cur) => (cur ?? []).map((b) => (b.id === bug.id ? { ...b, status: previous } : b)));
      }
    } catch {
      setError('Could not reach the bug board.');
      setBugs((cur) => (cur ?? []).map((b) => (b.id === bug.id ? { ...b, status: previous } : b)));
    } finally { setSavingId(null); }
  }

  if (bugs === null) {
    return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading the bug board…</div>;
  }

  if (!configured) {
    return (
      <div className="rounded-xl border border-[--color-border] p-4 text-sm text-muted">
        <p className="font-medium text-foreground">Bug board not connected</p>
        <p className="mt-1">
          The board lives in its own Supabase project. Set <code>BUG_BOARD_SUPABASE_URL</code> and{' '}
          <code>BUG_BOARD_SUPABASE_ANON_KEY</code> on the backend and this tab fills in.
        </p>
      </div>
    );
  }

  const term = q.trim().toLowerCase();
  const shown = bugs.filter((b) =>
    (column === 'all' || b.status === column)
    && (!term || [b.ref_id, b.title, b.description, b.reported_by, b.handled_by, ...(b.tags ?? [])]
      .some((x) => x?.toLowerCase().includes(term))));

  const counts = Object.fromEntries(COLUMNS.map(([key]) => [key, bugs.filter((b) => b.status === key).length]));

  return (
    <div className="flex flex-col gap-4">
      {/* Column counts double as filters, matching how the bookings table behaves. */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {([['all', 'All'] as [string, string]].concat(COLUMNS)).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setColumn(key)}
            className={cn('rounded-xl border px-3 py-2 text-left transition-colors',
              column === key ? 'border-brand-600 bg-brand-50' : 'border-[--color-border] hover:bg-brand-50/40')}>
            <p className="text-xl font-bold text-foreground leading-none">
              {key === 'all' ? bugs.length : counts[key] ?? 0}
            </p>
            <p className="text-[11px] text-muted mt-1">{label}</p>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search ref, title, tag or reporter…"
          className="w-full h-10 pl-9 pr-3 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {shown.length === 0 ? (
        <p className="text-sm text-muted">Nothing on the board matches.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((b) => (
            <div key={b.id} className="rounded-xl border border-[--color-border] p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs text-muted">{b.ref_id}</code>
                    <Badge tone={PRIORITY_TONE[b.priority] ?? 'neutral'}>{b.priority}</Badge>
                    {b.issue_type === 'feature_request' && <Badge tone="brand">feature</Badge>}
                  </div>
                  <button type="button" onClick={() => setOpenId(openId === b.id ? null : b.id)}
                    className="text-sm font-medium text-foreground text-left hover:underline mt-1 block">
                    {b.title}
                  </button>
                  <p className="text-xs text-muted mt-0.5">
                    {[b.reported_by && `by ${b.reported_by}`, b.handled_by && `handled by ${b.handled_by}`,
                      fmt(b.created_at)].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <select value={b.status} onChange={(e) => move(b, e.target.value)}
                  disabled={savingId === b.id} aria-label={`Status for ${b.ref_id}`}
                  className="h-9 px-2 rounded-lg bg-white text-xs shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none shrink-0">
                  {COLUMNS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>

              {openId === b.id && (
                <div className="mt-3 pt-3 border-t border-[--color-border] flex flex-col gap-2 text-xs text-muted">
                  {b.description && <p className="whitespace-pre-line">{b.description}</p>}
                  {(b.tags?.length ?? 0) > 0 && (
                    <p className="flex flex-wrap gap-1">
                      {b.tags!.map((t) => <span key={t} className="rounded-full bg-brand-50 px-2 py-0.5">{t}</span>)}
                    </p>
                  )}
                  {(b.screenshot_urls?.length ?? 0) > 0 && (
                    // Opened in a new tab rather than inlined: these are full-page screenshots and
                    // a row of them would swamp the list.
                    <p className="flex flex-wrap gap-3">
                      {b.screenshot_urls!.map((u, i) => (
                        <a key={u} href={u} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                          Screenshot {i + 1} <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
