'use client';
import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Toggle } from './ui/Toggle';
import { Card, CardBody } from './ui/Card';
import { RichTextEditor } from './ui/RichTextEditor';
import { TagInput } from './ui/TagInput';
import { SERVICE_CATEGORIES, SERVICE_DESCRIPTION_TEMPLATE } from '../lib/content';
import { SERVICE_CATALOG, catalogByCategory, type CatalogService } from '../lib/serviceCatalog';
import { proratePrice } from './ServiceListEditor';
import { isRichTextEmpty, richTextToPlain } from '../lib/sanitizeHtml';
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
  is_active: boolean;
  is_ppp: boolean;
  status?: string;   // 'pending' | 'approved' | 'rejected'
}

interface Question {
  id: string;
  question_text: string;
  is_required: boolean;
  question_type: string;
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
  const [customOpen, setCustomOpen] = useState(false);
  const [busyTag, setBusyTag]       = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [questions, setQuestions]   = useState<Record<string, Question[]>>({});

  const [form, setForm] = useState({ title: '', description: SERVICE_DESCRIPTION_TEMPLATE, type: 'video', duration: 30, category: '', tags: [] as string[] });
  const [formError, setFormError]     = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);
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

  const usedDurations = new Set(services.map((s) => s.duration));
  const availableDurations = DURATION_OPTIONS.filter((d) => !usedDurations.has(d));
  const usedTitles = new Set(services.map((s) => s.title.trim().toLowerCase()));
  const hasFree = services.some((s) => s.set_price === 0);

  function derivedPrice(duration: number, free: boolean): number {
    return free || !hasRate ? 0 : proratePrice(hourlyRate, duration);
  }
  function priceText(duration: number, free: boolean): string {
    if (free) return 'Free';
    if (!hasRate) return 'Set your base rate';
    return `${currency} ${proratePrice(hourlyRate, duration)}`;
  }

  // Create a service (from a catalogue tag or the custom form). The picker stays open, so the mentor
  // can keep adding; the new session drops into "Your sessions" below.
  async function createService(p: { title: string; description: string; type?: string; duration: number; category: string | null; free: boolean; tags: string[] }) {
    if (!p.free && !hasRate) { setError('Set your base rate on the Profile tab first, then add paid sessions.'); return; }
    try {
      await apiFetch('/api/mentor/services', 'POST', {
        title: p.title.trim(),
        description: isRichTextEmpty(p.description) ? null : p.description,
        type: p.type ?? 'video',
        duration: p.duration,
        category: p.category || null,
        set_price: derivedPrice(p.duration, p.free),
        is_active: true,
        is_ppp: false,
        tags: p.tags,
      });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not add the session.'); }
  }

  async function addFromCatalog(cat: CatalogService) {
    const duration = (availableDurations as readonly number[]).includes(cat.duration) ? cat.duration : availableDurations[0];
    if (duration == null) { setError('You already have a session for every length (15/30/45/60 min).'); return; }
    setBusyTag(cat.code);
    await createService({ title: cat.title, description: cat.description, duration, category: cat.category, free: !!cat.free, tags: [] });
    setBusyTag(null);
  }

  async function saveCustom() {
    if (!form.title.trim()) { setFormError('Give the session a title.'); return; }
    if (availableDurations.length === 0) { setFormError('You already have a session for every length.'); return; }
    setFormError(null); setSubmitting(true);
    await createService({ title: form.title, description: form.description, type: form.type, duration: form.duration, category: form.category || null, free: false, tags: form.tags });
    setSubmitting(false);
    setCustomOpen(false);
    setForm({ title: '', description: SERVICE_DESCRIPTION_TEMPLATE, type: 'video', duration: availableDurations[1] ?? 30, category: '', tags: [] });
  }

  async function toggleActive(id: string, current: boolean) {
    try {
      await apiFetch(`/api/mentor/services/${id}/active`, 'POST', { is_active: !current });
      setServices(s => s.map(svc => svc.id === id ? { ...svc, is_active: !current } : svc));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update the session.'); }
  }
  async function deleteService(id: string) {
    if (!confirm('Delete this session? This cannot be undone.')) return;
    try {
      await apiFetch(`/api/mentor/services/${id}/delete`, 'POST');
      setServices(s => s.filter(svc => svc.id !== id));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete the session.'); }
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
  const canAddMore = availableDurations.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* ── Add another session (picker) - ABOVE the list (BUG-070). Tapping a tag adds it and the
             picker STAYS OPEN so you can keep adding (point 1). ───────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
            {services.length > 0 ? 'Add another session' : 'Add your sessions'}
          </h3>
          <p className="text-xs text-muted mt-0.5">Tap one to add it. Prices come from your base rate, by length.</p>
        </div>

        {!canAddMore ? (
          <p className="text-xs text-muted">You have a session for every length (15, 30, 45, 60 min).</p>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Free intro call - its own category, only one allowed (BUG-059). */}
            {freeTags.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">
                  Introductory call <span className="text-xs font-normal text-emerald-700">· free</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {freeTags.map((cat) => (
                    <button key={cat.code} type="button" disabled={!!busyTag} onClick={() => addFromCatalog(cat)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100 disabled:opacity-50 transition-colors">
                      {busyTag === cat.code ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} {cat.title}
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
                      <button key={cat.code} type="button" disabled={!!busyTag} onClick={() => addFromCatalog(cat)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[--color-border] bg-white px-3 py-1.5 text-sm text-foreground hover:border-brand-500 hover:bg-brand-50 disabled:opacity-50 transition-colors">
                        {busyTag === cat.code ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 text-brand-600" />} {cat.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div>
              <p className="text-xs font-medium text-muted mb-1.5">Something else</p>
              <button type="button" onClick={() => { setForm(f => ({ ...f, duration: availableDurations[0] ?? 30 })); setCustomOpen(true); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[--color-border] bg-white px-3 py-1.5 text-sm text-brand-700 hover:border-brand-500 hover:bg-brand-50 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add your own session
              </button>
            </div>
          </div>
        )}

        {/* Custom-session form */}
        {customOpen && (
          <Card>
            <CardBody className="pt-5 flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-foreground">Your own session</h3>
              <Input label="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Portfolio review" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Duration *</label>
                  <select value={String(form.duration)} onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) }))}
                    className="h-10 px-3 rounded-lg bg-white text-sm border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300">
                    {availableDurations.map(d => <option key={d} value={d}>{d} minutes</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">Price</span>
                  <span className="h-10 flex items-center text-sm text-muted">{priceText(form.duration, false)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="h-10 px-3 rounded-lg bg-white text-sm border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300">
                  <option value="">Select a category</option>
                  {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Description</label>
                <RichTextEditor value={form.description} onChange={(html) => setForm(f => ({ ...f, description: html }))} maxChars={1000}
                  placeholder="Describe what this session covers and who it's for." />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Tags <span className="text-muted font-normal">(keywords that help match you to mentees)</span></label>
                <TagInput value={form.tags} onChange={(tags) => setForm(f => ({ ...f, tags }))} max={5} placeholder="e.g. CV review, Dutch market" />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-2">
                <Button variant="accent" onClick={saveCustom} loading={submitting}>Add session</Button>
                <Button variant="outline" onClick={() => { setCustomOpen(false); setFormError(null); }}>Cancel</Button>
              </div>
            </CardBody>
          </Card>
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
                  </p>
                  {!isRichTextEmpty(svc.description) && (
                    <p className="text-xs text-muted mt-1 line-clamp-2">{richTextToPlain(svc.description)}</p>
                  )}
                </div>
                {/* A proper switch (point 2), same control as Smart pricing - big enough to see + tap. */}
                <div className="flex items-center gap-2 shrink-0">
                  <Toggle checked={svc.is_active} onChange={() => toggleActive(svc.id, svc.is_active)}
                    aria-label={svc.is_active ? 'Deactivate session' : 'Activate session'} />
                  <button onClick={() => deleteService(svc.id)} title="Delete"
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
                <div className="border-t border-[--color-border] bg-neutral-50/60 p-4 flex flex-col gap-3">
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
              )}
            </div>
          ))}
        </div>
      )}

      {services.length === 0 && !creating && (
        <p className="text-sm text-muted">
          You haven&apos;t added any services yet.
        </p>
      )}

      {services.map(svc => (
        <div key={svc.id} className="rounded-xl border border-[--color-border] overflow-hidden">
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">{svc.title}</span>
                {svc.status === 'pending' ? (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700">Pending review</span>
                ) : svc.status === 'rejected' ? (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-red-50 text-red-700">Rejected</span>
                ) : (
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full font-medium',
                    svc.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-muted',
                  )}>
                    {svc.is_active ? 'Active' : 'Inactive'}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">
                {svc.duration}m · {svc.type === 'video' ? 'Video' : 'DM'} · {svc.set_price === 0 ? 'Free' : `${svc.set_currency} ${svc.set_price}`}
              </p>
              {!isRichTextEmpty(svc.description) && (
                <p className="text-xs text-muted mt-1 line-clamp-2">{richTextToPlain(svc.description)}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => toggleActive(svc.id, svc.is_active)} title={svc.is_active ? 'Deactivate' : 'Activate'}
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-neutral-100 transition-colors">
                {svc.is_active
                  ? <ToggleRight className="h-4 w-4 text-emerald-600" />
                  : <ToggleLeft className="h-4 w-4" />
                }
              </button>
              <button onClick={() => deleteService(svc.id)} title="Delete"
                className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
              <button onClick={() => toggleExpand(svc.id)} title="Questions"
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-neutral-100 transition-colors">
                {expandedId === svc.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {expandedId === svc.id && (
            <div className="border-t border-[--color-border] bg-neutral-50/60 p-4 flex flex-col gap-3">
              <p className="text-xs font-medium text-muted uppercase tracking-wide">Intake questions</p>
              {(questions[svc.id] ?? []).map(q => (
                <div key={q.id} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground">{q.question_text}</p>
                    <p className="text-xs text-muted">{q.is_required ? 'Required' : 'Optional'}</p>
                  </div>
                  <button onClick={() => deleteQuestion(svc.id, q.id)}
                    className="p-1 text-muted hover:text-red-600 transition-colors shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  placeholder="Add a question…"
                  value={newQuestion[svc.id]?.text ?? ''}
                  onChange={e => setNewQuestion(nq => ({ ...nq, [svc.id]: { ...nq[svc.id], text: e.target.value, required: nq[svc.id]?.required ?? false } }))}
                  className="flex-1 h-8 px-3 text-xs rounded-lg border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
                />
                <label className="flex items-center gap-1 text-xs text-muted cursor-pointer whitespace-nowrap">
                  <input type="checkbox"
                    checked={newQuestion[svc.id]?.required ?? false}
                    onChange={e => setNewQuestion(nq => ({ ...nq, [svc.id]: { ...nq[svc.id], required: e.target.checked, text: nq[svc.id]?.text ?? '' } }))}
                  />
                  Required
                </label>
                <Button variant="outline" onClick={() => addQuestion(svc.id)}
                  className="h-8 px-3 text-xs">
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
