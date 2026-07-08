'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { createClient } from '../../lib/supabase/client';
import '../../styles/immigroov-legacy.css';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'] });

type Webinar = {
  id: string; title: string; description: string | null; start_time: string; duration: number;
  capacity: number | null; mentor_name: string; registrations: number;
};

const mon = (s: string) => new Date(s).toLocaleString([], { month: 'short' }).toUpperCase();
const day = (s: string) => new Date(s).getDate();
const time = (s: string) => new Date(s).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });

export default function WebinarsPage() {
  const [rows, setRows] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefillEmail, setPrefillEmail] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/webinars', { cache: 'no-store' });
    const data = await res.json();
    setRows(res.ok ? data : []);
    setLoading(false);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setPrefillEmail(session?.user.email ?? '');
    })();
  }, []);

  return (
    <div className={`im-legacy ${inter.className}`}>
      <div className="container">
        <div style={{ background: 'linear-gradient(135deg,#0a2240,#15375f)', color: '#fff', borderRadius: 18, padding: '30px 28px', marginBottom: 24 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Live webinars</h2>
          <p style={{ opacity: .85, marginTop: 6, fontSize: 14.5 }}>Group sessions with Immigroov mentors. Register free to get the join link and reminders.</p>
        </div>

        {loading ? <div className="empty">Loading…</div> :
          rows.length === 0 ? <div className="empty">No upcoming webinars right now — check back soon.</div> :
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))' }}>
            {rows.map((w) => <Card key={w.id} w={w} prefillEmail={prefillEmail} onChange={load} />)}
          </div>}
      </div>
    </div>
  );
}

function Card({ w, prefillEmail, onChange }: { w: Webinar; prefillEmail: string; onChange: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState<string | null>(null);
  const [already, setAlready] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing a prop-derived default into local editable state
  useEffect(() => { setEmail(prefillEmail); }, [prefillEmail]);
  const full = w.capacity != null && w.registrations >= w.capacity;

  async function register() {
    if (!email.includes('@')) { setErr('Enter a valid email.'); return; }
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/webinars/${w.id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), name: name || null }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.detail || 'Registration failed.'); return; }
    setJoined(data.room_url || null);
    setAlready(!!data.already);
    onChange();
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 14, padding: 18 }}>
        <div style={{ flexShrink: 0, width: 58, textAlign: 'center', background: 'var(--navy-soft)', borderRadius: 12, padding: '8px 0', alignSelf: 'flex-start' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--orange-d)', letterSpacing: '.06em' }}>{mon(w.start_time)}</div>
          <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1, color: 'var(--navy2)' }}>{day(w.start_time)}</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16.5 }}>{w.title}</div>
          <div className="faint" style={{ fontSize: 13, marginTop: 2 }}>with {w.mentor_name} · {time(w.start_time)} · {w.duration} min</div>
          {w.description && <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 8 }}>{w.description}</div>}
          <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>👥 {w.registrations}{w.capacity != null ? ` / ${w.capacity}` : ''} registered</div>
        </div>
      </div>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--line)', padding: 14 }}>
        {joined ? (
          <div className="banner ok" style={{ margin: 0 }}>
            {already ? 'Already registered.' : "You're in!"}{' '}
            <a href={joined} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>Join link</a>
            {already ? ' — reminders already set.' : ' — emailed, with reminders 1 day & 1 hour before.'}
          </div>
        ) : full ? (
          <div className="banner bad" style={{ margin: 0 }}>This webinar is full.</div>
        ) : !open ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-cta" style={{ flex: 1 }} onClick={() => setOpen(true)}>Register free</button>
            <Link href={`/webinars/${w.id}`} className="btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center' }}>Details</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            {err && <div style={{ color: 'var(--bad)', fontSize: 12.5 }}>{err}</div>}
            <button className="btn btn-cta" disabled={busy} onClick={register}>{busy ? 'Registering…' : 'Confirm registration'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
