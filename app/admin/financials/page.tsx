'use client';
import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { Inter } from 'next/font/google';
import { createClient } from '../../../lib/supabase/client';
import '../../../styles/immigroov-legacy.css';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'] });

type Payout = {
  booking_id: string; created_at: string; status: string; slot_time: string;
  service_title: string; mentor_name: string; mentee_email: string;
  gross: number | null; currency: string | null; fee_pct: number | null;
  deduction: number | null; net_payout: number | null;
  mentor_net: number | null; mentor_currency: string | null; fx_rate: number | null; ppp: number | null;
  method: string | null; payout_status: string;
};
type Ledger = {
  id: string; created_at: string; booking_id: string; party: string; kind: string; pct: number | null;
  amount: number | null; currency: string | null; normalized_inr: number | null; reason: string;
  service_title: string; mentor_name: string; mentee_email: string; booking_status: string;
};

const fmt = (s: string | null) => (s ? new Date(s).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const money = (a: number | null, c: string | null) => (a == null ? '—' : `${Number(a).toFixed(2)} ${c || ''}`.trim());
const kindColor: Record<string, string> = { refund: '#0f7a44', credit: '#534ab7', charge: '#a32020', penalty: '#a32020' };

const th: CSSProperties = { textAlign: 'left', padding: '9px 12px', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--muted)', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' };
const td: CSSProperties = { padding: '9px 12px', fontSize: 13, borderBottom: '1px solid var(--line)', verticalAlign: 'top' };

export default function AdminFinancialsPage() {
  const [view, setView] = useState<'payouts' | 'ledger'>('payouts');
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const load = useCallback(async (accessToken: string) => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${accessToken}` };
    const [payoutsRes, ledgerRes] = await Promise.all([
      fetch('/api/admin/financials/payouts', { headers, cache: 'no-store' }),
      fetch('/api/admin/financials/ledger', { headers, cache: 'no-store' }),
    ]);
    if (payoutsRes.status === 403 || ledgerRes.status === 403) { setForbidden(true); setLoading(false); return; }
    setPayouts(payoutsRes.ok ? await payoutsRes.json() : []);
    setLedger(ledgerRes.ok ? await ledgerRes.json() : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setForbidden(true); setLoading(false); return; }
      setToken(session.access_token);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount, gated behind an async auth lookup
      load(session.access_token);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markPaid(bookingId: string) {
    if (!token) return;
    const ref = window.prompt('Payout reference (transfer id / UTR / note):', '');
    if (ref === null) return;
    const res = await fetch(`/api/admin/financials/payouts/${bookingId}/mark-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reference: ref || '' }),
    });
    if (!res.ok) { const data = await res.json().catch(() => ({})); window.alert(data.detail || 'Failed to mark paid.'); return; }
    load(token);
  }

  if (loading) {
    return <div className={`im-legacy ${inter.className}`}><div className="container"><div className="empty">Loading…</div></div></div>;
  }
  if (forbidden) {
    return (
      <div className={`im-legacy ${inter.className}`}>
        <div className="container" style={{ maxWidth: 480 }}>
          <div className="card" style={{ textAlign: 'center', padding: 30 }}>
            <h2 className="sec">Admin access required</h2>
            <p className="muted">Sign in with an admin account to view payouts and the ledger.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`im-legacy ${inter.className}`}>
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="sec">Financials</h2>
            <div className="lead">Payouts and money-ledger, cross-mentor.</div>
          </div>
        </div>

        <div className="seg" style={{ marginBottom: 16 }}>
          <button className={view === 'payouts' ? 'on' : ''} onClick={() => setView('payouts')}>Payouts ({payouts.length})</button>
          <button className={view === 'ledger' ? 'on' : ''} onClick={() => setView('ledger')}>Ledger ({ledger.length})</button>
        </div>

        {view === 'payouts' && (
          payouts.length === 0 ? <div className="empty">No payable sessions yet.</div> :
          <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
            <table className="adm-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead><tr>
                <th style={th}>Booked</th><th style={th}>Status</th><th style={th}>Mentor</th><th style={th}>Service</th>
                <th style={th}>Gross</th><th style={th}>Fee %</th><th style={th}>Deduction</th><th style={th}>Net (cust. ccy)</th>
                <th style={th}>Net (mentor ccy)</th><th style={th}>FX</th><th style={th}>PPP</th><th style={th}>Method</th><th style={th}>Payout</th>
              </tr></thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.booking_id}>
                    <td style={td}>{fmt(p.created_at)}</td>
                    <td style={td}><span className={`pill st-${p.status}`}>{p.status}</span></td>
                    <td style={td}>{p.mentor_name}</td>
                    <td style={td}>{p.service_title}</td>
                    <td style={td}>{money(p.gross, p.currency)}</td>
                    <td style={td}>{p.fee_pct == null ? '—' : `${p.fee_pct}%`}</td>
                    <td style={{ ...td, color: '#a32020' }}>−{money(p.deduction, p.currency)}</td>
                    <td style={{ ...td, fontWeight: 800, color: '#0f7a44' }}>{money(p.net_payout, p.currency)}</td>
                    <td style={td}>{p.mentor_net == null ? '—' : money(p.mentor_net, p.mentor_currency || '')}</td>
                    <td style={td}>{p.fx_rate == null ? '—' : Number(p.fx_rate).toFixed(2)}</td>
                    <td style={td}>{p.ppp == null ? '—' : `×${Number(p.ppp).toFixed(2)}`}</td>
                    <td style={td}>{p.method === 'auto_inr' ? 'Auto (INR)' : p.method === 'manual' ? 'Manual' : '—'}</td>
                    <td style={td}>
                      <span className={`pill ${p.payout_status === 'paid' ? 'st-completed' : p.payout_status === 'void' || p.payout_status === 'blocked' ? 'st-cancelled' : 'st-pending'}`}>{p.payout_status}</span>
                      {p.status === 'completed' && !['paid', 'void', 'blocked'].includes(p.payout_status) && (
                        <button className="btn-ghost btn-sm" style={{ marginLeft: 6 }} onClick={() => markPaid(p.booking_id)}>Mark paid</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'ledger' && (
          ledger.length === 0 ? <div className="empty">No ledger entries yet — refunds, credits, charges and penalties show up here.</div> :
          <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
            <table className="adm-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
              <thead><tr>
                <th style={th}>When</th><th style={th}>Booking</th><th style={th}>Party</th><th style={th}>Kind</th><th style={th}>%</th>
                <th style={th}>Amount</th><th style={th}>Mentor</th><th style={th}>Mentee</th><th style={th}>Reason</th>
              </tr></thead>
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.id}>
                    <td style={td}>{fmt(l.created_at)}</td>
                    <td style={td}>{l.booking_id.slice(0, 8)}</td>
                    <td style={td}>{l.party}</td>
                    <td style={{ ...td, fontWeight: 700, textTransform: 'capitalize', color: kindColor[l.kind] || 'inherit' }}>{l.kind}</td>
                    <td style={td}>{l.pct == null ? '—' : `${l.pct}%`}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{money(l.amount, l.currency)}</td>
                    <td style={td}>{l.mentor_name}</td>
                    <td style={td}>{l.mentee_email}</td>
                    <td style={{ ...td, color: 'var(--muted)', fontSize: 12 }}>{l.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
