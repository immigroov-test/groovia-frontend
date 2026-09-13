'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ExternalLink, ImageIcon, Pencil, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { Webinar } from '../lib/webinars';
import { webinarPrice, webinarWhen } from '../lib/webinars';
import { Button } from './ui/Button';
import { Card, CardBody } from './ui/Card';
import { WebinarMediaUpload } from './ui/WebinarMediaUpload';

const fieldClass = 'mt-1.5 w-full rounded-[10px] border border-[--color-border] bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

function localDateTime(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function minimumStart() {
  return localDateTime(new Date(Date.now() + 60_000).toISOString());
}

function errorDetail(data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((item) => item && typeof item === 'object' && 'msg' in item ? String(item.msg) : 'Invalid value').join('. ');
  }
  return fallback;
}

export function AdminWebinars({ mentors = [] }: { mentors?: { id: string; display_name: string }[] }) {
  const [rows, setRows] = useState<Webinar[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<Webinar | null>(null);
  const [paid, setPaid] = useState(false);
  const [posterUrl, setPosterUrl] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [minStart] = useState(minimumStart);

  const load = useCallback(async () => {
    const result = await apiFetch<Webinar[]>('/api/admin/webinars');
    if (result.ok) setRows(result.data);
    else setMessage(errorDetail(result.data, 'Could not load webinars.'));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function beginEdit(webinar: Webinar) {
    setEditing(webinar);
    setPaid(webinar.is_paid);
    setPosterUrl(webinar.banner_url ?? '');
    setMediaUrl(webinar.media_url ?? '');
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function stopEdit() {
    setEditing(null);
    setPaid(false);
    setPosterUrl('');
    setMediaUrl('');
    setMessage(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const start = new Date(String(data.get('starts_at')));
    if (!Number.isFinite(start.getTime()) || start <= new Date()) {
      setMessage('Choose a webinar date and time in the future.');
      return;
    }

    setBusy(editing?.id ?? 'create');
    setMessage(null);
    const payload = {
      title: String(data.get('title') || '').trim(),
      description: String(data.get('description') || '').trim(),
      banner_url: posterUrl.trim() || null,
      media_url: mediaUrl.trim() || null,
      starts_at: start.toISOString(),
      duration_minutes: Number(data.get('duration_minutes')),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      capacity: Number(data.get('capacity')),
      is_paid: paid,
      price: paid ? Number(data.get('price')) : 0,
      currency: String(data.get('currency') || 'INR').toUpperCase(),
      meeting_provider: editing?.meeting_provider || 'jitsi_public',
      meeting_url: editing?.meeting_url || null,
      mentor_id: data.get('mentor_id') || null,
      registration_deadline: editing?.registration_deadline || null,
    };
    const result = await apiFetch(`/api/admin/webinars${editing ? `/${editing.id}` : ''}`, {
      method: editing ? 'PATCH' : 'POST', json: payload,
    });
    setBusy(null);
    if (!result.ok) {
      setMessage(errorDetail(result.data, `Could not ${editing ? 'update' : 'create'} webinar.`));
      return;
    }
    setMessage(editing ? 'Webinar updated successfully.' : 'Webinar draft created successfully.');
    setEditing(null);
    setPaid(false);
    setPosterUrl('');
    setMediaUrl('');
    form.reset();
    await load();
  }

  async function act(id: string, action: string) {
    const note = ['reject', 'request-changes'].includes(action) ? window.prompt('Reviewer note') : null;
    setBusy(id);
    setMessage(null);
    const result = await apiFetch(`/api/admin/webinars/${id}/${action}`, { method: 'POST', json: { note } });
    setBusy(null);
    if (!result.ok) {
      setMessage(errorDetail(result.data, `Could not ${action.replace('-', ' ')} webinar.`));
      return;
    }
    setMessage(action === 'publish' ? 'Webinar published and now visible publicly.' : `Webinar ${action.replace('-', ' ')} completed.`);
    await load();
  }

  return <div className="flex flex-col gap-8">
    <Card><CardBody className="pt-6">
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="font-semibold text-brand-900">{editing ? 'Edit webinar' : 'Create webinar'}</h2><p className="mt-1 text-sm text-muted">Create a complete draft, review it, then publish it to the public listing.</p></div>
        {editing && <Button type="button" size="sm" variant="ghost" onClick={stopEdit}><X className="h-4 w-4" /> Cancel edit</Button>}
      </div>
      <form key={editing?.id ?? 'new'} onSubmit={save} className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-foreground sm:col-span-2">Webinar title<span className="text-red-600"> *</span><input required minLength={4} maxLength={140} name="title" defaultValue={editing?.title} placeholder="Example: Moving to the Netherlands — first 90 days" className={fieldClass} /></label>
        <label className="text-sm font-medium text-foreground sm:col-span-2">Description<span className="text-red-600"> *</span><textarea required minLength={20} maxLength={10000} name="description" defaultValue={editing?.description} rows={5} placeholder="Explain what attendees will learn, who it is for, and the agenda." className={fieldClass} /></label>
        <label className="text-sm font-medium text-foreground">Date and time<span className="text-red-600"> *</span><input required type="datetime-local" min={minStart} name="starts_at" defaultValue={localDateTime(editing?.starts_at)} className={fieldClass} /><span className="mt-1 block text-xs font-normal text-muted">Entered in your timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span></label>
        <label className="text-sm font-medium text-foreground">Duration in minutes<span className="text-red-600"> *</span><input required type="number" name="duration_minutes" min="15" max="480" defaultValue={editing?.duration_minutes ?? 60} className={fieldClass} /></label>
        <label className="text-sm font-medium text-foreground">Maximum attendees<span className="text-red-600"> *</span><input required type="number" name="capacity" min="1" max="10000" defaultValue={editing?.capacity ?? 100} className={fieldClass} /></label>
        <label className="text-sm font-medium text-foreground">Host mentor<select name="mentor_id" defaultValue={editing?.mentor_id ?? ''} className={fieldClass}><option value="">Select host later</option>{mentors.map((mentor) => <option key={mentor.id} value={mentor.id}>{mentor.display_name}</option>)}</select></label>
        <label className="text-sm font-medium text-foreground sm:col-span-2">Poster image<input type="url" name="banner_url" value={posterUrl} onChange={(event) => setPosterUrl(event.target.value)} placeholder="Paste a public image URL or upload below" className={fieldClass} /><span className="mt-1 block text-xs font-normal text-muted">Recommended size: 1600 × 900 px.</span><WebinarMediaUpload kind="poster" onUploaded={setPosterUrl} /></label>
        <label className="text-sm font-medium text-foreground sm:col-span-2">Supporting media<input type="url" name="media_url" value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="Paste a YouTube/resource URL or upload below" className={fieldClass} /><span className="mt-1 block text-xs font-normal text-muted">Optional trailer, explainer video, brochure, or other resource.</span><WebinarMediaUpload kind="media" onUploaded={setMediaUrl} /></label>
        <div className="sm:col-span-2 rounded-[10px] border border-[--color-border] bg-brand-50/40 p-4">
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="is_paid" checked={paid} onChange={(event) => setPaid(event.target.checked)} /> This is a paid webinar</label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-foreground">Price<input disabled={!paid} required={paid} type="number" name="price" min={paid ? '0.01' : '0'} step="0.01" defaultValue={editing?.price ?? 0} className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-50`} /></label>
            <label className="text-sm font-medium text-foreground">Currency code<input disabled={!paid} required={paid} name="currency" defaultValue={editing?.currency ?? 'INR'} minLength={3} maxLength={3} className={`${fieldClass} uppercase disabled:cursor-not-allowed disabled:opacity-50`} /></label>
          </div>
        </div>
        <div className="sm:col-span-2"><Button type="submit" variant="accent" loading={busy === (editing?.id ?? 'create')}>{editing ? 'Save changes' : 'Create draft'}</Button></div>
      </form>
      {message && <p role="status" className="mt-4 rounded-[10px] bg-brand-50 px-4 py-3 text-sm text-brand-800">{message}</p>}
    </CardBody></Card>

    <section><h2 className="font-semibold text-brand-900">All webinars</h2><div className="mt-4 flex flex-col gap-3">
      {rows.map((webinar) => {
        const past = new Date(webinar.starts_at) <= new Date();
        return <Card key={webinar.id}><CardBody className="py-5">
          <div className="flex justify-between gap-5 flex-wrap">
            <div className="flex min-w-0 gap-4">
              {webinar.banner_url ? <img src={webinar.banner_url} alt="" className="hidden h-20 w-32 rounded-[10px] border border-[--color-border] object-cover sm:block" /> : <div className="hidden h-20 w-32 items-center justify-center rounded-[10px] border border-dashed border-[--color-border] bg-brand-50 text-muted sm:flex"><ImageIcon className="h-5 w-5" /></div>}
              <div><p className="font-semibold text-brand-900">{webinar.title}</p><p className="mt-1 text-xs text-muted">{webinarWhen(webinar)} · {webinarPrice(webinar)} · {webinar.registration_count ?? 0}/{webinar.capacity}</p><p className="mt-2 text-xs font-semibold uppercase text-brand-700">{webinar.status.replace('_', ' ')}{webinar.source === 'mentor_request' ? ' · mentor request' : ''}{past ? ' · past' : ''}</p>{webinar.media_url && <a href={webinar.media_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">Open supporting media <ExternalLink className="h-3 w-3" /></a>}</div>
            </div>
            <div className="flex items-start gap-2 flex-wrap">
              {!['completed', 'cancelled'].includes(webinar.status) && <Button size="sm" variant="outline" onClick={() => beginEdit(webinar)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>}
              {webinar.status === 'pending_review' && <><Button size="sm" variant="outline" loading={busy === webinar.id} onClick={() => act(webinar.id, 'request-changes')}>Changes</Button><Button size="sm" variant="outline" loading={busy === webinar.id} onClick={() => act(webinar.id, 'reject')}>Reject</Button><Button size="sm" variant="accent" loading={busy === webinar.id} onClick={() => act(webinar.id, 'approve')}>Approve</Button></>}
              {['draft', 'approved'].includes(webinar.status) && <Button size="sm" variant="accent" disabled={past} loading={busy === webinar.id} onClick={() => act(webinar.id, 'publish')}>{past ? 'Reschedule to publish' : 'Publish'}</Button>}
              {webinar.status === 'published' && <Button size="sm" variant="outline" loading={busy === webinar.id} onClick={() => act(webinar.id, 'cancel')}>Cancel</Button>}
            </div>
          </div>
        </CardBody></Card>;
      })}
      {rows.length === 0 && <p className="text-sm text-muted">No webinars have been created yet.</p>}
    </div></section>
  </div>;
}
