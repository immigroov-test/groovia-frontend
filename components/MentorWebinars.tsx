'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { Webinar } from '../lib/webinars';
import { webinarPrice, webinarWhen } from '../lib/webinars';
import { Button } from './ui/Button';
import { Card, CardBody } from './ui/Card';

export function MentorWebinars() {
  const [rows, setRows] = useState<Webinar[]>([]); const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const [minimumStart] = useState(() => {
    const date = new Date(Date.now() + 60_000);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });
  const load = useCallback(async () => { const r = await apiFetch<Webinar[]>('/api/mentor/webinars'); if (r.ok) setRows(r.data); }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage(null); const fd = new FormData(e.currentTarget);
    const start = new Date(String(fd.get('starts_at')));
    if (!Number.isFinite(start.getTime()) || start <= new Date()) {
      setMessage('Choose a webinar date and time in the future.'); setBusy(false); return;
    }
    const isPaid = fd.get('is_paid') === 'on';
    const r = await apiFetch<{ detail?: string }>('/api/mentor/webinars/requests', { method: 'POST', json: {
      title: fd.get('title'), description: fd.get('description'), starts_at: start.toISOString(),
      duration_minutes: Number(fd.get('duration_minutes')), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      capacity: Number(fd.get('capacity')), is_paid: isPaid, price: isPaid ? Number(fd.get('price')) : 0, currency: String(fd.get('currency')),
    }});
    setMessage(r.ok ? 'Your webinar request was sent for review.' : (r.data?.detail || 'Could not submit request.'));
    if (r.ok) { e.currentTarget.reset(); await load(); } setBusy(false);
  }
  return <section className="flex flex-col gap-6">
    <div><h2 className="text-base font-semibold text-foreground">Host a webinar</h2><p className="text-sm text-muted mt-1">Propose a topic and schedule. An admin reviews every webinar before publication.</p></div>
    <Card><CardBody className="pt-6"><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm sm:col-span-2">Title<input required minLength={4} name="title" className="mt-1 w-full rounded-lg border p-2.5 bg-background" /></label>
      <label className="text-sm sm:col-span-2">Description<textarea required minLength={20} rows={4} name="description" className="mt-1 w-full rounded-lg border p-2.5 bg-background" /></label>
      <label className="text-sm">Preferred date and time<input required type="datetime-local" min={minimumStart} name="starts_at" className="mt-1 w-full rounded-lg border p-2.5 bg-background" /><span className="mt-1 block text-xs text-muted">The selected time must be in the future.</span></label>
      <label className="text-sm">Duration (minutes)<input required type="number" min="15" max="480" defaultValue="60" name="duration_minutes" className="mt-1 w-full rounded-lg border p-2.5 bg-background" /></label>
      <label className="text-sm">Capacity<input required type="number" min="1" max="10000" defaultValue="100" name="capacity" className="mt-1 w-full rounded-lg border p-2.5 bg-background" /></label>
      <label className="text-sm flex items-center gap-2 pt-7"><input type="checkbox" name="is_paid" /> Paid webinar</label>
      <label className="text-sm">Proposed price<input type="number" min="0" step="0.01" defaultValue="0" name="price" className="mt-1 w-full rounded-lg border p-2.5 bg-background" /></label>
      <label className="text-sm">Currency<input name="currency" defaultValue="INR" maxLength={3} className="mt-1 w-full rounded-lg border p-2.5 bg-background uppercase" /></label>
      <div className="sm:col-span-2"><Button type="submit" variant="accent" loading={busy}>Submit for review</Button>{message && <p className="mt-2 text-sm text-muted">{message}</p>}</div>
    </form></CardBody></Card>
    <div><h3 className="text-sm font-semibold">Your webinar requests</h3><div className="mt-3 flex flex-col gap-3">{rows.map(w => <Card key={w.id}><CardBody className="py-4 flex justify-between gap-4"><div><p className="font-medium text-sm">{w.title}</p><p className="text-xs text-muted mt-1">{webinarWhen(w)} · {webinarPrice(w)}</p>{w.admin_note && <p className="text-xs text-amber-700 mt-2">Admin note: {w.admin_note}</p>}</div><span className="text-xs font-semibold uppercase text-muted">{w.status.replace('_',' ')}</span></CardBody></Card>)}{rows.length === 0 && <p className="text-sm text-muted">No webinar requests yet.</p>}</div></div>
  </section>;
}
