'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../lib/api';
import { Button } from './ui/Button';
import Link from 'next/link';
import type { Webinar } from '../lib/webinars';
import { openRazorpayCheckout, type RazorpaySuccess } from '../lib/razorpay';

export function WebinarRegistration({ webinar, loggedIn, initiallyConfirmed = false }: { webinar: Webinar; loggedIn: boolean; initiallyConfirmed?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const full = (webinar.registration_count ?? 0) >= webinar.capacity;

  async function register() {
    if (!loggedIn) { router.push(`/login?next=${encodeURIComponent(`/webinars/${webinar.slug}`)}`); return; }
    setBusy(true); setMessage(null);
    const res = await apiFetch<{ payment_required: boolean; registration: { id: string }; order?: { order_id: string; key_id: string; amount: number; currency: string }; detail?: string }>(`/api/webinars/${webinar.id}/register`, { method: 'POST' });
    if (!res.ok) { setMessage(res.data?.detail || 'Registration failed.'); setBusy(false); return; }
    if (!res.data.payment_required) { setMessage('Your seat is confirmed.'); setBusy(false); return; }
    if (!res.data.order) { setMessage('Could not create payment checkout.'); setBusy(false); return; }
    const registrationId = res.data.registration.id;
    const opened = await openRazorpayCheckout({
      key: res.data.order.key_id, amount: res.data.order.amount, currency: res.data.order.currency,
      name: 'Immigroov', description: webinar.title, order_id: res.data.order.order_id,
      handler: async (payment: RazorpaySuccess) => {
        const confirmed = await apiFetch<{ detail?: string }>('/api/webinars/payments/confirm', { method: 'POST', json: {
          registration_id: registrationId, razorpay_order_id: payment.razorpay_order_id,
          razorpay_payment_id: payment.razorpay_payment_id, razorpay_signature: payment.razorpay_signature,
        }});
        setMessage(confirmed.ok ? 'Payment received. Your seat is confirmed.' : (confirmed.data?.detail || 'Payment verification failed.'));
        setBusy(false);
      }, modal: { ondismiss: () => setBusy(false) },
    });
    if (!opened) { setMessage('Could not load payment checkout.'); setBusy(false); }
  }

  const confirmed = initiallyConfirmed || message?.includes('confirmed');
  return <div>
    {!initiallyConfirmed && <Button variant="accent" loading={busy} disabled={full} onClick={register}>{full ? 'Webinar full' : webinar.is_paid ? 'Register and pay' : 'Register free'}</Button>}
    {initiallyConfirmed && <p className="text-sm font-semibold text-emerald-700">Your seat is confirmed.</p>}
    {message && <p className="mt-3 text-sm text-muted" role="status">{message}</p>}
    {confirmed && <Link href={`/webinars/${webinar.slug}/join`} className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline">Open webinar room →</Link>}
  </div>;
}