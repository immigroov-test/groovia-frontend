'use client';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Eye, FileText, History, Loader2, Pencil } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody } from './ui/Card';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { LegalMarkdown } from './LegalMarkdown';

// ── Shapes returned by /legal/admin/* ────────────────────────────────────────
interface LegalRow {
  id: string;
  code: string;
  slug: string;
  title: string;
  audience: string;
  audience_label: string;
  region_scope: string;
  current_version: string | null;
  last_updated: string | null;
  last_published_by: string | null;
  has_draft: boolean;
  draft_updated_at: string | null;
  version_count: number;
  is_active: boolean;
}

interface HistoryEntry {
  id: string;
  version: string;
  published_at: string;
  published_by: string;
  change_note: string | null;
  is_current: boolean;
}

interface LegalDetail {
  id: string;
  code: string;
  title: string;
  audience_label: string;
  region_scope: string;
  current_version: string | null;
  last_updated: string | null;
  published_content: string | null;
  has_draft: boolean;
  draft_updated_at: string | null;
  editor_content: string;
  history: HistoryEntry[];
}

interface ArchivedVersion {
  id: string;
  version: string;
  content: string;
  change_note: string | null;
  published_at: string;
  published_by: string;
  is_current: boolean;
}

const REGION_LABEL: Record<string, string> = { in: 'India', row: 'Rest of World' };

const AUDIENCE_TONE: Record<string, 'brand' | 'accent' | 'neutral'> = {
  everyone: 'neutral',
  customers: 'brand',
  mentors: 'accent',
};

function when(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function AdminLegalDocs() {
  const [rows, setRows] = useState<LegalRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  // Deactivating stops the document being served to anyone, so it confirms first;
  // reactivating just undoes that and needs no confirmation.
  const [confirmDeactivate, setConfirmDeactivate] = useState<LegalRow | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { ok, data } = await apiFetch<LegalRow[]>('/api/legal/admin/documents');
    if (!ok || !Array.isArray(data)) { setError('Could not load the legal documents.'); return; }
    setRows(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setActive(row: LegalRow, isActive: boolean) {
    setTogglingId(row.id); setError(null);
    const { ok, data } = await apiFetch<{ detail?: string }>(
      `/api/legal/admin/documents/${row.id}/active`, { method: 'POST', json: { is_active: isActive } });
    setTogglingId(null);
    setConfirmDeactivate(null);
    if (!ok) { setError(data?.detail || 'Could not update the document.'); return; }
    await load();
  }

  if (openId) {
    return <DocumentEditor
      documentId={openId}
      onBack={() => { setOpenId(null); load(); }}
    />;
  }

  if (rows === null && !error) {
    return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  const drafts = (rows ?? []).filter((r) => r.has_draft).length;
  const unpublished = (rows ?? []).filter((r) => !r.current_version).length;

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {(drafts > 0 || unpublished > 0) && (
        <p className="text-sm text-muted">
          {drafts > 0 && <>{drafts} document{drafts === 1 ? '' : 's'} with unpublished changes. </>}
          {unpublished > 0 && <>{unpublished} never published — users cannot see {unpublished === 1 ? 'it' : 'them'} yet.</>}
        </p>
      )}

      {/* The table scrolls inside its own box: six columns do not fit a phone, and
          letting the page scroll sideways would take the admin nav with it. */}
      <div className="overflow-x-auto rounded-2xl bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-8px_rgba(15,23,42,0.08)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[--color-border] text-left">
              <Th>Document</Th>
              <Th>Target audience</Th>
              <Th>Version</Th>
              <Th>Last updated</Th>
              <Th>Draft</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="border-b border-[--color-border] last:border-0 align-middle">
                <td className="px-4 py-3">
                  <span className="text-xs text-muted tabular-nums mr-2">{r.code}</span>
                  <span className="font-medium text-foreground">{r.title}</span>
                  {!r.is_active && <Badge tone="neutral" className="ml-1.5">Inactive</Badge>}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={AUDIENCE_TONE[r.audience] ?? 'neutral'}>{r.audience_label}</Badge>
                  {r.region_scope !== 'all' && (
                    <span className="ml-1.5 text-xs text-muted">{REGION_LABEL[r.region_scope] ?? r.region_scope}</span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {r.current_version
                    ? <span className="text-foreground">{r.current_version}</span>
                    : <span className="text-amber-700">Not published</span>}
                </td>
                <td className="px-4 py-3 text-muted whitespace-nowrap">
                  {when(r.last_updated)}
                  {r.last_published_by && <span className="block text-xs text-muted/70">by {r.last_published_by}</span>}
                </td>
                <td className="px-4 py-3">
                  {r.has_draft
                    ? <Badge tone="warning">Unpublished draft</Badge>
                    : <span className="text-xs text-muted">—</span>}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  {r.is_active ? (
                    <Button size="sm" variant="ghost" className="ml-1.5" loading={togglingId === r.id}
                      disabled={!!togglingId} onClick={() => setConfirmDeactivate(r)}>
                      Deactivate
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="ml-1.5" loading={togglingId === r.id}
                      disabled={!!togglingId} onClick={() => setActive(r, true)}>
                      Reactivate
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows?.length === 0 && (
        <p className="text-sm text-muted">
          No documents yet. Run <code className="text-xs">legal_documents_setup.sql</code>, then{' '}
          <code className="text-xs">python -m scripts.seed_legal_documents</code>.
        </p>
      )}

      <ConfirmDialog
        open={!!confirmDeactivate}
        title="Deactivate this document?"
        body={`${confirmDeactivate?.title ?? 'This document'} stops being served to anyone - the public page, admin checkout bundles and consent gates that reference it will no longer find it. Its version history and every acknowledgement or consent record against it are kept exactly as they are. You can reactivate it at any time.`}
        confirmLabel="Deactivate"
        alternateLabel="Cancel"
        busy={!!togglingId}
        onConfirm={() => { if (confirmDeactivate) return setActive(confirmDeactivate, false); }}
        onClose={() => setConfirmDeactivate(null)}
      />
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 text-xs font-medium text-muted ${className}`}>{children}</th>;
}

// ── Editor ───────────────────────────────────────────────────────────────────
function DocumentEditor({ documentId, onBack }: { documentId: string; onBack: () => void }) {
  const [doc, setDoc] = useState<LegalDetail | null>(null);
  const [content, setContent] = useState('');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [busy, setBusy] = useState<null | 'draft' | 'publish' | 'discard'>(null);
  // Is this revision MATERIAL? It decides the version bump (major resets the minor), and
  // with it whether affected users are emailed and asked to accept before carrying on, or
  // simply shown a dismissible notice. It was hardcoded false, which meant every publish
  // after the initial v1.0 was editorial and a real change to terms could never reach
  // anyone. Defaults to false so the heavier path is always a deliberate choice.
  const [material, setMaterial] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [viewing, setViewing] = useState<ArchivedVersion | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { ok, data } = await apiFetch<LegalDetail>(`/api/legal/admin/documents/${documentId}`);
    if (!ok || !data?.id) { setError('Could not load this document.'); return; }
    setDoc(data);
    setContent(data.editor_content ?? '');
  }, [documentId]);
  useEffect(() => { load(); }, [load]);

  // Whether the editor holds anything not yet saved to the draft. Publishing while
  // this is true would publish the SAVED draft, not what is on screen - so the
  // publish button saves first (see publish() below) rather than silently
  // shipping older text than the admin is looking at.
  const dirty = !!doc && content !== (doc.editor_content ?? '');

  async function saveDraft(): Promise<boolean> {
    setBusy('draft'); setError(null); setNotice(null);
    const { ok, data } = await apiFetch<{ detail?: string }>(
      `/api/legal/admin/documents/${documentId}/draft`, { method: 'POST', json: { content } });
    setBusy(null);
    if (!ok) { setError(data?.detail || 'Could not save the draft.'); return false; }
    setNotice('Draft saved. Nothing has been published and no one has been notified.');
    await load();
    return true;
  }

  async function discardDraft() {
    setBusy('discard'); setError(null); setNotice(null);
    const { ok, data } = await apiFetch<{ detail?: string }>(
      `/api/legal/admin/documents/${documentId}/draft/discard`, { method: 'POST' });
    setBusy(null);
    if (!ok) { setError(data?.detail || 'Could not discard the draft.'); return; }
    setNotice('Draft discarded.');
    await load();
  }

  async function publish(changeNote: string) {
    setError(null); setNotice(null);
    // Save what is on screen first, so the version that goes out is the text the
    // admin just read in the confirmation - not a stale draft from an earlier save.
    if (dirty && !(await saveDraft())) { setConfirming(false); return; }

    setBusy('publish');
    const { ok, data } = await apiFetch<{ detail?: string; version?: string }>(
      `/api/legal/admin/documents/${documentId}/publish`,
      { method: 'POST', json: { change_note: changeNote || null, major: material } });
    setBusy(null);
    setConfirming(false);
    if (!ok) { setError(data?.detail || 'Could not publish the update.'); return; }
    setMaterial(false);
    setNotice(material
      ? `Published ${data?.version}. Affected users have been emailed and must accept it before continuing.`
      : `Published ${data?.version}. Affected users will be shown a notice to review it.`);
    await load();
  }

  async function viewVersion(versionId: string) {
    setError(null);
    const { ok, data } = await apiFetch<ArchivedVersion>(`/api/legal/admin/versions/${versionId}`);
    if (!ok || !data?.id) { setError('Could not load that version.'); return; }
    setViewing(data);
  }

  if (!doc && !error) {
    return <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }
  if (!doc) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-red-600">{error}</p>
        <div><Button size="sm" variant="outline" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> Back</Button></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button type="button" onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All legal documents
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-foreground">{doc.title}</h3>
        <Badge tone="neutral">{doc.audience_label}</Badge>
        {doc.region_scope !== 'all' && <Badge tone="neutral">{REGION_LABEL[doc.region_scope] ?? doc.region_scope}</Badge>}
        {doc.current_version
          ? <span className="text-sm text-muted">{doc.current_version} · updated {when(doc.last_updated)}</span>
          : <span className="text-sm text-amber-700">Never published</span>}
      </div>

      {doc.has_draft && (
        <p className="text-sm text-amber-700">
          This document has an unpublished draft{doc.draft_updated_at ? ` saved ${when(doc.draft_updated_at)}` : ''}.
          Users still see {doc.current_version ?? 'nothing'}.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}

      {/* Edit / Preview. Markdown is the storage format, so the preview is the only
          honest way to check how a clause will actually break across lines. */}
      <div className="flex items-center gap-1 border-b border-[--color-border]">
        {(['edit', 'preview'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === k ? 'border-brand-900 text-brand-900' : 'border-transparent text-muted hover:text-foreground'}`}>
            {k === 'edit' ? <><Pencil className="inline h-3.5 w-3.5 mr-1.5" />Edit</> : <><Eye className="inline h-3.5 w-3.5 mr-1.5" />Preview</>}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted pr-1">
          {content.length.toLocaleString()} characters{dirty ? ' · unsaved' : ''}
        </span>
      </div>

      {tab === 'edit' ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
          rows={26}
          className="w-full px-4 py-3 rounded-xl bg-white font-mono text-[13px] leading-relaxed resize-y
                     shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]"
          placeholder="Markdown. Use ## for each numbered section."
        />
      ) : (
        <Card><CardBody className="pt-5">
          {content.trim()
            ? <LegalMarkdown content={content} />
            : <p className="text-sm text-muted">Nothing to preview yet.</p>}
        </CardBody></Card>
      )}

      {/* The two actions, and only these two. Save Draft is the safe one and reads
          as such; Publish carries the consequence and confirms before it fires. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" loading={busy === 'draft'} disabled={!!busy}
          onClick={() => saveDraft()}>
          Save Draft
        </Button>
        <Button variant="accent" loading={busy === 'publish'} disabled={!!busy || !content.trim()}
          onClick={() => setConfirming(true)}>
          Publish Official Update
        </Button>
        <label className="flex items-start gap-2 text-sm text-muted cursor-pointer select-none basis-full sm:basis-auto">
          <input
            type="checkbox"
            className="mt-0.5 accent-[--color-brand-500]"
            checked={material}
            disabled={!!busy}
            onChange={(e) => setMaterial(e.target.checked)}
          />
          <span>
            Material change
            <span className="block text-xs text-muted/70">
              Bumps the major version, emails everyone it applies to, and requires their
              acceptance before they can continue. Leave off for wording and typo fixes.
            </span>
          </span>
        </label>
        {doc.has_draft && (
          <Button variant="ghost" size="sm" loading={busy === 'discard'} disabled={!!busy}
            onClick={() => discardDraft()}>
            Discard draft
          </Button>
        )}
      </div>
      <p className="text-xs text-muted -mt-3">
        Saving a draft changes nothing for users: the official version and its date stay as they are,
        and no one is notified. Publishing creates the next version and asks affected users to review it.
      </p>

      {/* ── Version history ──────────────────────────────────────────────────── */}
      <section className="mt-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <History className="h-4 w-4" /> Version history
        </h4>
        {doc.history.length === 0 ? (
          <p className="text-sm text-muted mt-2">No versions published yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {doc.history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[--color-border] px-4 py-2.5">
                <span className="font-medium text-foreground tabular-nums">{h.version}</span>
                {h.is_current && <Badge tone="success">Current</Badge>}
                <span className="text-sm text-muted">{when(h.published_at)}</span>
                <span className="text-sm text-muted">by {h.published_by}</span>
                {h.change_note && <span className="text-sm text-muted/80 basis-full">{h.change_note}</span>}
                <button type="button" onClick={() => viewVersion(h.id)}
                  className="ml-auto text-sm font-medium text-brand-700 hover:underline">
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirming}
        title="Publish official update?"
        body={material
          ? 'This is a MATERIAL change. It creates a new major version, emails everyone the document applies to, and blocks them until they accept it.'
          : 'This creates a new minor version. Affected users see a dismissible notice asking them to review it, and are not emailed.'}
        confirmLabel="Publish official update"
        alternateLabel="Not yet"
        busy={busy === 'publish' || busy === 'draft'}
        reason={{ label: 'What changed?', placeholder: 'Shown in the version history (optional)' }}
        onConfirm={(note) => publish(note)}
        onClose={() => setConfirming(false)}
      />

      {viewing && <ArchivedVersionModal version={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

// A previous version, strictly read-only. There is no edit affordance here on
// purpose, and none would work: the versions table rejects UPDATE and DELETE at
// the database level, so a published version cannot be rewritten from anywhere.
function ArchivedVersionModal({ version, onClose }: { version: ArchivedVersion; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[--color-border]">
          <div className="flex flex-wrap items-center gap-2">
            <FileText className="h-4 w-4 text-muted" />
            <span className="font-semibold text-brand-900 tabular-nums">{version.version}</span>
            {version.is_current
              ? <Badge tone="success">Current</Badge>
              : <Badge tone="neutral">Archived</Badge>}
            <span className="text-sm text-muted">{when(version.published_at)} · by {version.published_by}</span>
          </div>
          {version.change_note && <p className="text-sm text-muted mt-1">{version.change_note}</p>}
          <p className="text-xs text-muted/70 mt-1">Read-only. Published versions can never be edited or deleted.</p>
        </div>
        <div className="px-6 py-5 overflow-y-auto">
          <LegalMarkdown content={version.content} />
        </div>
        <div className="px-6 py-4 border-t border-[--color-border] flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
