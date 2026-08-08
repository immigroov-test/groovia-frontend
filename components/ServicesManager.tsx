'use client';
import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardBody } from './ui/Card';
import { RichTextEditor } from './ui/RichTextEditor';
import { TagInput } from './ui/TagInput';
import { SERVICE_CATEGORIES, SERVICE_DESCRIPTION_TEMPLATE } from '../lib/content';
import { catalogByCategory, type CatalogService } from '../lib/serviceCatalog';
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
  platform_fee: number;
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

export function ServicesManager() {
  const [services, setServices]     = useState<Service[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [creating, setCreating]     = useState(false);
  const [picking, setPicking]       = useState(false);   // showing the catalogue tags to pick from
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [questions, setQuestions]   = useState<Record<string, Question[]>>({});

  const [form, setForm] = useState({
    title: '', description: '', type: 'video', duration: 30,
    category: '', set_price: '', is_ppp: false, tags: [] as string[],
  });
  // BUG-059: "free" is the one Introductory call slot from the catalogue, not a price any service
  // can be typed down to. True only when the open form was opened via that catalogue tag.
  const [isFreeSlot, setIsFreeSlot] = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [newQuestion, setNewQuestion] = useState<Record<string, { text: string; required: boolean }>>({});

  async function load() {
    setLoading(true); setError(null);
    try { setServices(await apiFetch('/api/mentor/services')); }
    catch (e: any) { setError(e.message); }
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

  // Durations already taken by an existing service (each length is offered once).
  const usedDurations = new Set(services.map((s) => s.duration));
  const availableDurations = DURATION_OPTIONS.filter((d) => !usedDurations.has(d));

  // Titles the mentor already offers, so the catalogue can mark those tags as added.
  const usedTitles = new Set(services.map((s) => s.title.trim().toLowerCase()));
  // BUG-059: at most one free (price 0) service - the catalogue's Introductory call - not a price
  // any custom or other-category service can be typed down to.
  const hasFreeService = services.some((s) => Number(s.set_price) === 0);

  // "Add service" opens the catalogue tags (same design as onboarding) instead of a blank form.
  function startPick() { setFormError(null); setPicking(true); }

  // Tap a catalogue tag -> open the create block prefilled from the template. The template's
  // suggested length may already be taken (one service per length), so fall back to an open one.
  function pickCatalog(cat: CatalogService) {
    if (cat.free && hasFreeService) return;   // already have the one free slot
    const duration = (availableDurations as readonly number[]).includes(cat.duration) ? cat.duration : (availableDurations[0] ?? cat.duration);
    setForm({ title: cat.title, description: cat.description, type: 'video', duration, category: cat.category, set_price: cat.free ? '0' : '', is_ppp: false, tags: [] });
    setIsFreeSlot(!!cat.free);
    setFormError(null); setPicking(false); setCreating(true);
  }
  function pickCustom() {
    const first = availableDurations[0] ?? 30;
    setForm({ title: '', description: SERVICE_DESCRIPTION_TEMPLATE, type: 'video', duration: first, category: '', set_price: '', is_ppp: false, tags: [] });
    setIsFreeSlot(false);
    setFormError(null); setPicking(false); setCreating(true);
  }

  async function createService() {
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    const duration = parseInt(String(form.duration));
    if (!DURATION_OPTIONS.includes(duration as (typeof DURATION_OPTIONS)[number])) { setFormError('Pick a session length.'); return; }
    if (usedDurations.has(duration)) { setFormError('You already have a session of this length.'); return; }
    const price = isFreeSlot ? 0 : parseFloat(form.set_price) || 0;
    // BUG-059: free is reserved for the single Introductory call slot, picked from the catalogue -
    // a regular/custom service can't be priced down to 0 to become a second free session.
    if (price === 0 && !isFreeSlot) { setFormError('Only the Introductory call session can be free. Set a price for this one.'); return; }
    if (isFreeSlot && hasFreeService) { setFormError('You already have a free session (Introductory call). Only one is allowed.'); return; }
    setFormError(null); setSubmitting(true);
    try {
      await apiFetch('/api/mentor/services', 'POST', {
        title:       form.title.trim(),
        description: isRichTextEmpty(form.description) ? null : form.description,
        type:        form.type,
        duration,
        category:    form.category.trim() || null,
        set_price:   price,
        is_active:   true,
        is_ppp:      form.is_ppp,
        tags:        form.tags,
      });
      setCreating(false);
      setForm({ title: '', description: '', type: 'video', duration: 30, category: '', set_price: '', is_ppp: false, tags: [] });
      setIsFreeSlot(false);
      await load();
    } catch (e: any) { setFormError(e.message); }
    finally { setSubmitting(false); }
  }

  async function toggleActive(id: string, current: boolean) {
    try {
      await apiFetch(`/api/mentor/services/${id}/active`, 'POST', { is_active: !current });
      setServices(s => s.map(svc => svc.id === id ? { ...svc, is_active: !current } : svc));
    } catch (e: any) { setError(e.message); }
  }

  async function deleteService(id: string) {
    if (!confirm('Delete this service? This cannot be undone.')) return;
    try {
      await apiFetch(`/api/mentor/services/${id}/delete`, 'POST');
      setServices(s => s.filter(svc => svc.id !== id));
    } catch (e: any) { setError(e.message); }
  }

  async function addQuestion(serviceId: string) {
    const q = newQuestion[serviceId];
    if (!q?.text?.trim()) return;
    try {
      await apiFetch(`/api/mentor/services/${serviceId}/questions`, 'POST', {
        service_id:    serviceId,
        question_text: q.text.trim(),
        is_required:   q.required ?? false,
        question_type: 'text',
      });
      setNewQuestion(nq => ({ ...nq, [serviceId]: { text: '', required: false } }));
      await loadQuestions(serviceId);
    } catch (e: any) { setError(e.message); }
  }

  async function deleteQuestion(serviceId: string, questionId: string) {
    try {
      await apiFetch(`/api/mentor/services/questions/${questionId}/delete`, 'POST');
      setQuestions(qs => ({
        ...qs,
        [serviceId]: qs[serviceId].filter(q => q.id !== questionId),
      }));
    } catch (e: any) { setError(e.message); }
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-muted py-6">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading services…
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* BUG-070: add-session sits above the list, so a newly added service appears below it here. */}
      {creating ? (
        <Card>
          <CardBody className="pt-5 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">New service</h3>
            <Input label="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. 30-min Career Q&A" />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Description</label>
              <RichTextEditor value={form.description} onChange={(html) => setForm(f => ({ ...f, description: html }))}
                maxChars={1000}
                placeholder="e.g. A focused 30-minute call to review your CV and tailor it for the Dutch job market, with concrete next steps." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="h-10 px-3 rounded-lg bg-white text-sm border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300">
                  <option value="video">Video call</option>
                  <option value="dm">DM / Text</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Duration *</label>
                <select value={String(form.duration)}
                  onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) }))}
                  className="h-10 px-3 rounded-lg bg-white text-sm border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300">
                  {availableDurations.map(d => (
                    <option key={d} value={d}>{d} minutes</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Category</label>
                <select value={form.category ?? ''}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="h-10 px-3 rounded-lg bg-white text-sm border border-[--color-border] focus:outline-none focus:ring-2 focus:ring-brand-300">
                  <option value="">Select a category</option>
                  {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Input label="Price (USD)" type="number" min={isFreeSlot ? 0 : 0.01} step={0.01}
                value={isFreeSlot ? '0' : form.set_price}
                onChange={e => setForm(f => ({ ...f, set_price: e.target.value }))}
                disabled={isFreeSlot}
                placeholder={isFreeSlot ? undefined : 'e.g. 50'}
                hint={isFreeSlot ? 'Free - this is your one Introductory call slot.' : undefined} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Tags <span className="text-muted font-normal">(keywords that help us match you to the right mentees)</span></label>
              <TagInput value={form.tags} onChange={(tags) => setForm(f => ({ ...f, tags }))} max={5} placeholder="e.g. CV review, Dutch market, HSM visa" />
            </div>
            <p className="text-xs text-muted">Purchasing-power parity is set once for all your sessions with the Smart pricing toggle above.</p>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex gap-2">
              <Button variant="accent" onClick={createService} loading={submitting}>Save</Button>
              <Button variant="outline" onClick={() => { setCreating(false); setIsFreeSlot(false); }}>Cancel</Button>
            </div>
          </CardBody>
        </Card>
      ) : picking ? (
        <Card>
          <CardBody className="pt-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Add a session</h3>
                <p className="text-xs text-muted mt-0.5">Tap one to add it, then set the length and description.</p>
              </div>
              <Button variant="outline" onClick={() => setPicking(false)} className="h-8 px-3 text-xs">Cancel</Button>
            </div>
            <div className="flex flex-col gap-3">
              {catalogByCategory(SERVICE_CATEGORIES).map((g) => (
                <div key={g.category}>
                  <p className="text-xs font-medium text-muted mb-1.5">{g.category}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.services.map((cat) => {
                      const added = usedTitles.has(cat.title.trim().toLowerCase());
                      // BUG-059: the free Introductory call is a single slot - once the mentor has
                      // any free service, the tag disables like an already-added one.
                      const blocked = added || (cat.free && hasFreeService);
                      return (
                        <button key={cat.code} type="button" onClick={() => pickCatalog(cat)} disabled={blocked}
                          title={!added && cat.free && hasFreeService ? 'You already have a free session' : undefined}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                            blocked
                              ? 'border-[--color-border] bg-neutral-100 text-muted cursor-not-allowed'
                              : 'border-[--color-border] bg-white text-foreground hover:border-brand-500 hover:bg-brand-50',
                          )}>
                          <Plus className="h-3.5 w-3.5 text-brand-600" /> {cat.title}
                          {added && <span className="text-[10px] uppercase tracking-wide">added</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div>
                <p className="text-xs font-medium text-muted mb-1.5">Something else</p>
                <button type="button" onClick={pickCustom}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[--color-border] bg-white px-3 py-1.5 text-sm text-brand-700 hover:border-brand-500 hover:bg-brand-50 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Add your own service
                </button>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : availableDurations.length > 0 ? (
        <button
          onClick={startPick}
          className="flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add service
        </button>
      ) : (
        <p className="text-xs text-muted">You have a service for every length (15, 30, 45, 60 min).</p>
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
