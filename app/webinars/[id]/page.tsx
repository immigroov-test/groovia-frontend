'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Inter } from 'next/font/google';
import { createClient } from '../../../lib/supabase/client';
import '../../../styles/immigroov-legacy.css';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'] });

type W = {
  id: string; title: string; description: string | null; start_time: string; duration: number;
  capacity: number | null; status: string; mentor_name: string; registrations: number;
};
const fmt = (s: string) => new Date(s).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' });

export default function WebinarShare() {
  const params = useParams();
  const id = params?.id as string;
  const [w, setW] = useState<W | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState<string | null>(null);
  const [already, setAlready] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/webinars/${id}`, { cache: 'no-store' });
    if (!res.ok) { setNotFound(true); setLoading(false); return; }
    setW((await res.json()) as W);
    setLoading(false);
  }, [id]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
  useEffect(() => { if (id) load(); }, [id, load]);
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setEmail(session?.user.email ?? '');
    })();
  }, []);

  async function register() {
    if (!email.includes('@')) { setErr('Enter a valid email.'); return; }
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/webinars/${id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), name: name || null }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.detail || 'Registration failed.'); return; }
    setJoined(data.room_url || null);
    setAlready(!!data.already);
    load();
  }

  if (loading) {
    return (
      <div className={`im-legacy ${inter.className}`}>
        <div className="container"><div className="empty">Loading…</div></div>
      </div>
    );
  }
  if (notFound || !w) {
    return (
      <div className={`im-legacy ${inter.className}`}>
        <div className="container"><div className="empty">This webinar link is invalid.</div></div>
      </div>
    );
  }

  const full = w.capacity != null && w.registrations >= w.capacity;
  // eslint-disable-next-line react-hooks/purity -- render-time "has this started yet" check; a render's worth of staleness is harmless here
  const closed = w.status !== 'scheduled' || new Date(w.start_time).getTime() < Date.now();

  return (
    <div className={`im-legacy ${inter.className}`}>
      <div className="container" style={{ maxWidth: 620 }}>
        <div className="card" style={{ padding: 24 }}>
          <h2 className="sec" style={{ marginBottom: 6 }}>{w.title}</h2>
          <div className="faint" style={{ fontSize: 14 }}>with {w.mentor_name} · {w.duration} min</div>
          <div style={{ fontWeight: 700, margin: '8px 0', fontSize: 15 }}>{fmt(w.start_time)}</div>
          {w.description && <p style={{ fontSize: 14.5, color: 'var(--muted)', marginBottom: 10 }}>{w.description}</p>}
          <div className="faint" style={{ fontSize: 12.5, marginBottom: 14 }}>{w.registrations}{w.capacity != null ? ` / ${w.capacity}` : ''} registered</div>

          {joined ? (
            <div className="banner ok">
              <b>{already ? "You're already registered." : "You're registered!"}</b>{' '}
              <a href={joined} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>Join link</a>.<br />
              {already
                ? "We won't send a duplicate confirmation — your reminders are already set for 1 day and 1 hour before."
                : <>We&apos;ve emailed your confirmation, and we&apos;ll remind you <b>1 day before</b> and <b>1 hour before</b> it starts.</>}
            </div>
          ) : closed ? (
            <div className="banner bad">Registration for this webinar is closed.</div>
          ) : full ? (
            <div className="banner bad">This webinar is full.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
              <input placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              {err && <div style={{ color: 'var(--bad)', fontSize: 12.5 }}>{err}</div>}
              <button className="btn btn-cta" disabled={busy} onClick={register}>{busy ? 'Registering…' : 'Register'}</button>
              <div className="faint" style={{ fontSize: 12 }}>You&apos;ll get a confirmation email plus reminders 1 day and 1 hour before.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
