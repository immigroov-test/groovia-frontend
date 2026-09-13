'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { Webinar } from '../lib/webinars';
import { webinarPrice, webinarWhen } from '../lib/webinars';
import { Button } from './ui/Button';
import { Card, CardBody } from './ui/Card';

export function AdminWebinars({ mentors = [] }: { mentors?: { id: string; display_name: string }[] }) {
  const [rows, setRows] = useState<Webinar[]>([]); const [busy, setBusy] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(async () => { const r = await apiFetch<Webinar[]>('/api/admin/webinars'); if (r.ok) setRows(r.data); }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy('create'); const fd = new FormData(e.currentTarget); const paid = fd.get('is_paid') === 'on';
    const r = await apiFetch<{ detail?: string }>('/api/admin/webinars', { method: 'POST', json: {
      title: fd.get('title'), description: fd.get('description'), starts_at: new Date(String(fd.get('starts_at'))).toISOString(), duration_minutes: Number(fd.get('duration_minutes')),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, capacity: Number(fd.get('capacity')), is_paid: paid, price: paid ? Number(fd.get('price')) : 0,
      currency: String(fd.get('currency')), meeting_provider: 'jitsi_public', mentor_id: fd.get('mentor_id') || null,
    }});
    setMessage(r.ok ? 'Webinar draft created.' : (r.data?.detail || 'Could not create webinar.')); if (r.ok) { e.currentTarget.reset(); await load(); } setBusy(null);
  }
  async function act(id: string, action: string) { setBusy(id); const note = ['reject','request-changes'].includes(action) ? window.prompt('Reviewer note') : null; await apiFetch(`/api/admin/webinars/${id}/${action}`, { method: 'POST', json: { note } }); await load(); setBusy(null); }
  return <div className="flex flex-col gap-8">
    <Card><CardBody className="pt-6"><h2 className="font-semibold">Create webinar</h2><form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2">
      <input required name="title" placeholder="Webinar title" className="rounded-lg border p-2.5 bg-background sm:col-span-2" />
      <textarea required name="description" minLength={4} rows={3} placeholder="Description" className="rounded-lg border p-2.5 bg-background sm:col-span-2" />
      <input required type="datetime-local" name="starts_at" className="rounded-lg border p-2.5 bg-background" /><input required type="number" name="duration_minutes" min="15" max="480" defaultValue="60" className="rounded-lg border p-2.5 bg-background" />
      <input required type="number" name="capacity" min="1" defaultValue="100" className="rounded-lg border p-2.5 bg-background" /><select name="mentor_id" className="rounded-lg border p-2.5 bg-background"><option value="">Select host later</option>{mentors.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}</select>
      <label className="text-sm flex items-center gap-2"><input type="checkbox" name="is_paid" /> Paid</label><div className="grid grid-cols-2 gap-2"><input type="number" name="price" min="0" step="0.01" defaultValue="0" className="rounded-lg border p-2.5 bg-background" /><input name="currency" defaultValue="INR" maxLength={3} className="rounded-lg border p-2.5 bg-background" /></div>
      <div className="sm:col-span-2"><Button type="submit" variant="accent" loading={busy === 'create'}>Create draft</Button>{message && <span className="ml-3 text-sm text-muted">{message}</span>}</div>
    </form></CardBody></Card>
    <div className="flex flex-col gap-3">{rows.map(w => <Card key={w.id}><CardBody className="py-5"><div className="flex justify-between gap-4 flex-wrap"><div><p className="font-semibold">{w.title}</p><p className="text-xs text-muted mt-1">{webinarWhen(w)} · {webinarPrice(w)} · {w.registration_count ?? 0}/{w.capacity}</p><p className="text-xs uppercase font-semibold text-brand-700 mt-2">{w.status.replace('_',' ')}{w.source === 'mentor_request' ? ' · mentor request' : ''}</p></div><div className="flex gap-2 flex-wrap">
        {w.status === 'pending_review' && <><Button size="sm" variant="outline" loading={busy === w.id} onClick={() => act(w.id,'request-changes')}>Changes</Button><Button size="sm" variant="outline" loading={busy === w.id} onClick={() => act(w.id,'reject')}>Reject</Button><Button size="sm" variant="accent" loading={busy === w.id} onClick={() => act(w.id,'approve')}>Approve</Button></>}
        {['draft','approved'].includes(w.status) && <Button size="sm" variant="accent" loading={busy === w.id} onClick={() => act(w.id,'publish')}>Publish</Button>}
        {w.status === 'published' && <Button size="sm" variant="outline" loading={busy === w.id} onClick={() => act(w.id,'cancel')}>Cancel</Button>}
      </div></div></CardBody></Card>)}</div>
  </div>;
}
