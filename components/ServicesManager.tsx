'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Toggle } from './ui/Toggle';
import { Card, CardBody } from './ui/Card';
import { RichTextEditor } from './ui/RichTextEditor';
import { TagInput } from './ui/TagInput';
import { ExpandableRichText } from './ui/ExpandableRichText';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { SERVICE_CATEGORIES, SERVICE_DESCRIPTION_TEMPLATE } from '../lib/content';
import { SERVICE_CATALOG, catalogByCategory, type CatalogService } from '../lib/serviceCatalog';
import { proratePrice } from './ServiceListEditor';
import { isRichTextEmpty } from '../lib/sanitizeHtml';
import { cn } from '../lib/utils';

interface Service {
  id: string;
  title: string;
  description: string | null;
  type: string;
  duration: number;
  category: string | null;
  set_price: number;
  set_currency: string;
  /** What the mentor's additional-currency rates come to for this length, written by the backend. */
  currency_prices?: { currency: string; base_price: number }[] | null;
  is_active: boolean;
  is_ppp: boolean;
  status?: string;   // 'pending' | 'approved' | 'rejected'
  tags?: string[];
}

interface Question {
  id: string;
  question_text: string;
  is_required: boolean;
  question_type: string;
}

// A draft being reviewed before it's actually submitted - shared shape for both "tap a catalogue
// tag" and "add your own session" (BUG-137). `code` distinguishes a catalogue-backed draft (its
// title/description came from a template, still fully editable) from a custom one.
interface Draft {
  code: string | null;
  title: string;
  description: string;
  category: string;
  duration: number;
  tags: string[];
  free: boolean;
}

// A mentor offers at most one service per duration. These are the only lengths.
const DURATION_OPTIONS = [15, 30, 45, 60] as const;

async function apiFetch(path: string, method = 'GET', body?: object) {
  const supabase = (await import('../lib/supabase/client')).createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// Prices are ALWAYS derived from the mentor's base hourly rate (point 4) - never hand-typed here - so
// they stay in sync with the base rate everywhere (customer, admin). hourlyRate + currency come from
// the mentor's Profile-tab pricing.
export function ServicesManager({ hourlyRate, currency = 'USD' }: { hourlyRate?: number; currency?: string }) {
  const [services, setServices]     = useState<Service[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [questions, setQuestions]   = useState<Record<string, Question[]>>({});

  // BUG-137: tapping a catalogue tag (or "Add your own session") opens this editable draft
  // instead of posting immediately - nothing is created, and the service does NOT enter the admin
  // approval queue, until the mentor explicitly confirms it below.
  const [draft, setDraft]           = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  // The draft form renders below the whole session list, so on a mentor with several sessions the
  // "add" button appeared to do nothing: the form opened off-screen. Bring it into view instead.
  const draftRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!draft) return;
    // rAF so the form has laid out before we measure where to scroll to.
    const id = requestAnimationFrame(() =>
      draftRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    return () => cancelAnimationFrame(id);
  }, [draft]);
  const [submitting, setSubmitting] = useState(false);
  // A second, explicit "yes, add it" step after "Add session" - reviewing the draft isn't itself a
  // commitment (a mentor can edit fields and change their mind mid-review), so the actual submit gets
  // its own confirmation instead of firing the moment the button is clicked.
  const [confirmingAdd, setConfirmingAdd] = useState(false);

  // BUG-137: inline edit of an EXISTING service's text/details (title, description, category, tags).
  const [editingId, setEditingId]   = useState<string | null>(null);
  // Deleting a session type is permanent and used to go through the browser's native confirm().
  // Deactivating keeps it and just hides it, which is what most people actually want.
  const [pendingDelete, setPendingDelete] = useState<Service | null>(null);
  const [editForm, setEditForm]     = useState<{ title: string; description: string; category: string; tags: string[]; duration: number } | null>(null);
  const [editError, setEditError]   = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [newQuestion, setNewQuestion] = useState<Record<string, { text: string; required: boolean }>>({});

  const hasRate = !!hourlyRate && hourlyRate > 0;

  async function load() {
    setLoading(true); setError(null);
    try { setServices(await apiFetch('/api/mentor/services')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load services'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function loadQuestions(serviceId: string) {
    try {
      const data = await apiFetch(`/api/mentor/services/${serviceId}/questions`);
      setQuestions(q => ({ ...q, [serviceId]: data }));
    } catch { /* ignore */ }
  }
  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!questions[id]) loadQuestions(id);
  }

  // BUG-137: a REJECTED service is dead - it will never become bookable - so it must not go on
  // permanently occupying its duration slot / title. Only active (pending or approved) services
  // count against the one-per-duration limit and the "you already added this" catalogue filter;
  // this is what was silently hiding "more services" once a rejection had happened.
  const liveServices = services.filter(s => s.status !== 'rejected');
  // Every length stays selectable, always. This used to filter out durations already in use, on a
  // one-service-per-duration rule that exists NOWHERE else: no DB constraint, no check in
  // create_service. The imported data contradicts it outright - arun-thanigaivel has four 45-minute
  // sessions, vasanth-leyo has six 30-minute ones - so mentors were left with one or two lengths to
  // choose from, and could not even keep a session's own length when editing it. Mentors legitimately
  // offer several sessions of the same length on different topics.
  const availableDurations = DURATION_OPTIONS;
  const usedTitles = new Set(liveServices.map((s) => s.title.trim().toLowerCase()));
  const hasFree = liveServices.some((s) => s.set_price === 0);

  function derivedPrice(duration: number, free: boolean): number {
    return free || !hasRate ? 0 : proratePrice(hourlyRate, duration);
  }
  function priceText(duration: number, free: boolean): string {
    if (free) return 'Free';
    if (!hasRate) return 'Set your base rate';
    return `${currency} ${proratePrice(hourlyRate, duration)}`;
  }

  // ── Add flow: tap a tag or "Add your own" opens a draft; nothing is submitted until Confirm ──

  function openDraftFromCatalog(cat: CatalogService) {
    const duration = cat.duration;
    setDraftError(null);
    setDraft({ code: cat.code, title: cat.title, description: cat.description, category: cat.category, duration, tags: [], free: !!cat.free });
  }
  function openCustomDraft() {
    setDraftError(null);
    setDraft({ code: null, title: '', description: SERVICE_DESCRIPTION_TEMPLATE, category: '', duration: availableDurations[0] ?? 30, tags: [], free: false });
  }
  function cancelDraft() { setDraft(null); setDraftError(null); setConfirmingAdd(false); }

  // "Add session" validates the draft and, if it's good, opens the "add this service?" step below -
  // it does NOT submit by itself. Reviewing/editing a draft isn't a commitment; the mentor can still
  // back out here without anything being created.
  function requestConfirmAdd() {
    if (!draft) return;
    if (!draft.title.trim()) { setDraftError('Give the session a title.'); return; }
    if (!draft.free && !hasRate) { setDraftError('Set your base rate on the Profile tab first, then add paid sessions.'); return; }
    setDraftError(null);
    setConfirmingAdd(true);
  }

  // The actual submission - only reached after the mentor reviews the draft AND explicitly confirms
  // "yes, add it" below. This is the ONLY place a service is created; from here it goes into the
  // normal pending/admin-review flow exactly as it always has.
  async function confirmDraft() {
    if (!draft) return;
    setSubmitting(true);
    try {
      await apiFetch('/api/mentor/services', 'POST', {
        title: draft.title.trim(),
        description: isRichTextEmpty(draft.description) ? null : draft.description,
        type: 'video',
        duration: draft.duration,
        category: draft.category || null,
        set_price: derivedPrice(draft.duration, draft.free),
        is_active: true,
        is_ppp: false,
        tags: draft.tags,
      });
      await load();
      setDraft(null);
      setConfirmingAdd(false);
    } catch (e) {
      setConfirmingAdd(false);
      setDraftError(e instanceof Error ? e.message : 'Could not add the session.');
    }
    finally { setSubmitting(false); }
  }

  async function toggleActive(id: string, current: boolean) {
    try {
      await apiFetch(`/api/mentor/services/${id}/active`, 'POST', { is_active: !current });
      setServices(s => s.map(svc => svc.id === id ? { ...svc, is_active: !current } : svc));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update the session.'); }
  }
  async function deleteService(id: string) {
    try {
      await apiFetch(`/api/mentor/services/${id}/delete`, 'POST');
      setServices(s => s.filter(svc => svc.id !== id));
      if (editingId === id) { setEditingId(null); setEditForm(null); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete the session.'); }
  }

  // ── Edit an EXISTING service's title/description/category/tags (BUG-137) ────────────────────

  function startEdit(svc: Service) {
    setExpandedId(svc.id);
    setEditingId(svc.id);
    setEditError(null);
    setEditForm({
      title: svc.title,
      description: svc.description ?? '',
      category: svc.category ?? '',
      tags: svc.tags ?? [],
      duration: svc.duration,
    });
  }
  function cancelEdit() { setEditingId(null); setEditForm(null); setEditError(null); }
  async function saveEdit(id: string) {
    if (!editForm) return;
    if (!editForm.title.trim()) { setEditError('Give the session a title.'); return; }
    setEditError(null); setSavingEdit(true);
    try {
      await apiFetch(`/api/mentor/services/${id}/update`, 'POST', {
        title: editForm.title.trim(),
        description: isRichTextEmpty(editForm.description) ? null : editForm.description,
        category: editForm.category || null,
        tags: editForm.tags,
        duration: editForm.duration,
      });
      setServices(s => s.map(svc => svc.id === id
        ? { ...svc, title: editForm.title.trim(), description: isRichTextEmpty(editForm.description) ? null : editForm.description, category: editForm.category || null, tags: editForm.tags, duration: editForm.duration,
            set_price: svc.set_price > 0 ? derivedPrice(editForm.duration, false) : svc.set_price }
        : svc));
      setEditingId(null); setEditForm(null);
    } catch (e) { setEditError(e instanceof Error ? e.message : 'Could not save changes.'); }
    finally { setSavingEdit(false); }
  }

  async function addQuestion(serviceId: string) {
    const q = newQuestion[serviceId];
    if (!q?.text?.trim()) return;
    try {
      await apiFetch(`/api/mentor/services/${serviceId}/questions`, 'POST', {
        service_id: serviceId, question_text: q.text.trim(), is_required: q.required ?? false, question_type: 'text',
      });
      setNewQuestion(nq => ({ ...nq, [serviceId]: { text: '', required: false } }));
      await loadQuestions(serviceId);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not add the question.'); }
  }
  async function deleteQuestion(serviceId: string, questionId: string) {
    try {
      await apiFetch(`/api/mentor/services/questions/${questionId}/delete`, 'POST');
      setQuestions(qs => ({ ...qs, [serviceId]: qs[serviceId].filter(q => q.id !== questionId) }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete the question.'); }
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-muted py-6">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions…
    </div>
  );

  const freeTags = hasFree ? [] : SERVICE_CATALOG.filter((c) => c.free && !usedTitles.has(c.title.trim().toLowerCase()));

  return (

    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* ── Add another session (picker) - ABOVE the list (BUG-070). Tapping a tag opens an
             editable draft below (BUG-137) - nothing is created until it's confirmed. ─────────── */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
            {services.length > 0 ? 'Add another session' : 'Add your sessions'}
          </h3>
          <p className="text-xs text-muted mt-0.5">Tap one to review it before adding. Prices come from your base rate, by length.</p>
        </div>

        {(
          <div className="flex flex-col gap-4">
            {/* Free intro call - its own category, only one allowed (BUG-059). */}
            {freeTags.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">
                  Introductory call <span className="text-xs font-normal text-emerald-700">· free</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {freeTags.map((cat) => (
                    <button key={cat.code} type="button" onClick={() => openDraftFromCatalog(cat)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100 transition-colors">
                      <Plus className="h-3.5 w-3.5" /> {cat.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {catalogByCategory(SERVICE_CATEGORIES).map((g) => {
              const tags = g.services.filter((cat) => !cat.free && !usedTitles.has(cat.title.trim().toLowerCase()));
              if (tags.length === 0) return null;
              return (
                <div key={g.category}>
                  <p className="text-sm font-semibold text-foreground mb-2">{g.category}</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((cat) => (
                      <button key={cat.code} type="button" onClick={() => openDraftFromCatalog(cat)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[--color-border] bg-white px-3 py-1.5 text-sm text-foreground hover:border-brand-500 hover:bg-brand-50 transition-colors">
                        <Plus className="h-3.5 w-3.5 text-brand-600" /> {cat.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div>
              <p className="text-xs font-medium text-muted mb-1.5">Something else</p>
              <button type="button" onClick={openCustomDraft}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[--color-border] bg-white px-3 py-1.5 text-sm text-brand-700 hover:border-brand-500 hover:bg-brand-50 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add your own session
              </button>
            </div>
          </div>
        )}

        {/* Draft review - BUG-137: whether it started from a catalogue tag or "add your own", the
            mentor reviews/edits every field here and must press "Add session" to actually create
            it (and only then does it enter the admin approval workflow). */}
        {draft && (
          <div ref={draftRef}>
          <Card>
            <CardBody className="pt-5 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-foreground">
                {draft.code ? 'Review before adding' : 'Your own session'}
              </h3>
              <Input label="Title *" value={draft.title} onChange={e => setDraft(d => d && ({ ...d, title: e.target.value }))} placeholder="e.g. Portfolio review" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Duration *</label>
                  <select value={String(draft.duration)} onChange={e => setDraft(d => d && ({ ...d, duration: parseInt(e.target.value) }))}
                    className="h-10 px-3 rounded-lg bg-white text-sm border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300">
                    {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d} minutes</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Price</span>
                  <span className="h-10 flex items-center text-sm text-muted">{priceText(draft.duration, draft.free)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Category</label>
                <select value={draft.category} onChange={e => setDraft(d => d && ({ ...d, category: e.target.value }))}
                  className="h-10 px-3 rounded-lg bg-white text-sm border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300">
                  <option value="">Select a category</option>
                  {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Description</label>
                <RichTextEditor value={draft.description} onChange={(html) => setDraft(d => d && ({ ...d, description: html }))} maxChars={1000}
                  placeholder="Describe what this session covers and who it's for." />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Tags <span className="text-muted font-normal">(keywords that help match you to mentees)</span></label>
                <TagInput value={draft.tags} onChange={(tags) => setDraft(d => d && ({ ...d, tags }))} max={5} placeholder="e.g. CV review, Dutch market" />
              </div>
              {draftError && <p className="text-sm text-red-600">{draftError}</p>}
              <div className="flex gap-2">
                <Button variant="accent" onClick={requestConfirmAdd} loading={submitting}>Add session</Button>
                <Button variant="outline" onClick={cancelDraft}>Cancel</Button>
              </div>

              {/* Explicit "yes, add it" step (point 2): the draft above is still just a review - this
                  is the actual commit, so it gets its own plain-language confirmation instead of firing
                  the moment "Add session" is clicked. */}
              {confirmingAdd && (
                <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4 flex flex-col gap-3">
                  <p className="text-sm text-foreground">
                    Add <strong>{draft.title.trim()}</strong> ({draft.duration} min · {priceText(draft.duration, draft.free)})?
                    It will be submitted for admin approval before it&apos;s bookable.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="accent" size="sm" onClick={confirmDraft} loading={submitting}>Yes, add it</Button>
                    <Button variant="outline" size="sm" onClick={() => setConfirmingAdd(false)} disabled={submitting}>Cancel</Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
          </div>
        )}
      </div>

      {/* ── Your sessions - BELOW the picker (BUG-070) ──────────────────────────────────────────── */}
      {services.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Your sessions</h3>
          {services.map(svc => (
            <div key={svc.id} className={cn('rounded-xl border border-[--color-border] overflow-hidden', !svc.is_active && 'opacity-70')}>
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{svc.title}</span>
                    {svc.status === 'pending' ? (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700">Pending review</span>
                    ) : svc.status === 'rejected' ? (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-red-50 text-red-700">Rejected</span>
                    ) : (
                      <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', svc.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-muted')}>
                        {svc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted">
                    {svc.duration}m · {svc.type === 'video' ? 'Video' : 'DM'} · {svc.set_price === 0 ? 'Free' : `${svc.set_currency} ${svc.set_price}`}
                    {svc.set_price > 0 && (
                      <>
                        <span className="text-muted"> (shown to customers worldwide)</span>
                        {(svc.currency_prices ?? []).filter(cp => cp.base_price > 0).map(cp => (
                          <span key={cp.currency} className="block">
                            {cp.currency} {cp.base_price}
                            <span className="text-muted"> (shown to customers paying in {cp.currency})</span>
                          </span>
                        ))}
                      </>
                    )}
                    {svc.category && <> · {svc.category}</>}
                  </p>
                  {/* BUG-137: full rich text (same component the customer sees), not a truncated
                      plain-text preview - a mentor must be able to read their own listing in full. */}
                  {editingId !== svc.id && !isRichTextEmpty(svc.description) && (
                    <ExpandableRichText html={svc.description ?? ''} />
                  )}
                </div>
                {/* A proper switch (point 2), same control as Smart pricing - big enough to see + tap. */}
                <div className="flex items-center gap-2 shrink-0">
                  <Toggle checked={svc.is_active} onChange={() => toggleActive(svc.id, svc.is_active)}
                    aria-label={svc.is_active ? 'Deactivate session' : 'Activate session'} />
                  <button onClick={() => startEdit(svc)} title="Edit session"
                    className="h-9 w-9 flex items-center justify-center rounded-lg text-muted hover:text-brand-700 hover:bg-brand-50 transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setPendingDelete(svc)} title="Delete"
                    className="h-9 w-9 flex items-center justify-center rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="h-5 w-5" />
                  </button>
                  <button onClick={() => toggleExpand(svc.id)} title="Intake questions"
                    className="h-9 w-9 flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-neutral-100 transition-colors">
                    {expandedId === svc.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {expandedId === svc.id && (
                <div className="border-t border-[--color-border] bg-neutral-50/60 p-4 flex flex-col gap-4">
                  {editingId === svc.id && editForm ? (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-medium text-muted uppercase tracking-wide">Edit session</p>
                      <Input label="Title *" value={editForm.title}
                        onChange={e => setEditForm(f => f && ({ ...f, title: e.target.value }))} />
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-foreground">Length</label>
                        {/* Lengths already taken by the mentor's OTHER sessions are excluded; this
                            session's own current length always stays selectable. */}
                        <select value={String(editForm.duration)}
                          onChange={e => setEditForm(f => f && ({ ...f, duration: parseInt(e.target.value) }))}
                          className="h-10 px-3 rounded-lg bg-white text-sm border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300">
                          {DURATION_OPTIONS
                            .map(d => <option key={d} value={d}>{d} minutes</option>)}
                        </select>
                        {svc.set_price > 0 && editForm.duration !== svc.duration && (
                          <p className="text-xs text-muted">
                            Price becomes {priceText(editForm.duration, false)} when you save.
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-foreground">Category</label>
                        <select value={editForm.category} onChange={e => setEditForm(f => f && ({ ...f, category: e.target.value }))}
                          className="h-10 px-3 rounded-lg bg-white text-sm border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300">
                          <option value="">Select a category</option>
                          {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-foreground">Description</label>
                        <RichTextEditor value={editForm.description} onChange={(html) => setEditForm(f => f && ({ ...f, description: html }))} maxChars={1000}
                          placeholder="Describe what this session covers and who it's for." />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-foreground">Tags</label>
                        <TagInput value={editForm.tags} onChange={(tags) => setEditForm(f => f && ({ ...f, tags }))} max={5} placeholder="e.g. CV review, Dutch market" />
                      </div>
                      {editError && <p className="text-xs text-red-600">{editError}</p>}
                      <div className="flex gap-2">
                        <Button variant="accent" size="sm" onClick={() => saveEdit(svc.id)} loading={savingEdit}>Save changes</Button>
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => startEdit(svc)}
                      className="self-start text-xs font-medium text-brand-700 hover:text-brand-900 inline-flex items-center gap-1">
                      <Pencil className="h-3 w-3" /> Edit this session
                    </button>
                  )}

                  <div className="flex flex-col gap-3 border-t border-[--color-border] pt-4">
                    <p className="text-xs font-medium text-muted uppercase tracking-wide">Intake questions</p>
                    {(questions[svc.id] ?? []).map(q => (
                      <div key={q.id} className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground">{q.question_text}</p>
                          <p className="text-xs text-muted">{q.is_required ? 'Required' : 'Optional'}</p>
                        </div>
                        <button onClick={() => deleteQuestion(svc.id, q.id)} className="p-1 text-muted hover:text-red-600 transition-colors shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-1">
                      <input type="text" placeholder="Add a question…" value={newQuestion[svc.id]?.text ?? ''}
                        onChange={e => setNewQuestion(nq => ({ ...nq, [svc.id]: { ...nq[svc.id], text: e.target.value, required: nq[svc.id]?.required ?? false } }))}
                        className="flex-1 h-8 px-3 text-xs rounded-lg border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white" />
                      <label className="flex items-center gap-1 text-xs text-muted cursor-pointer whitespace-nowrap">
                        <input type="checkbox" checked={newQuestion[svc.id]?.required ?? false}
                          onChange={e => setNewQuestion(nq => ({ ...nq, [svc.id]: { ...nq[svc.id], required: e.target.checked, text: nq[svc.id]?.text ?? '' } }))} />
                        Required
                      </label>
                      <Button variant="outline" onClick={() => addQuestion(svc.id)} className="h-8 px-3 text-xs">Add</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete} onClose={() => setPendingDelete(null)}
        title="Delete this session type?"
        body={<>This removes <strong>{pendingDelete?.title}</strong> permanently. Existing bookings are
          unaffected, but mentees can no longer book it. Deactivating hides it instead and keeps it for
          later.</>}
        confirmLabel="Yes, delete it"
        alternateLabel="Deactivate instead"
        onAlternate={async () => {
          const svc = pendingDelete;
          setPendingDelete(null);
          if (svc?.is_active) await toggleActive(svc.id, svc.is_active);
        }}
        onConfirm={async () => {
          const svc = pendingDelete;
          setPendingDelete(null);
          if (svc) await deleteService(svc.id);
        }}
      />
    </div>
  );
}
