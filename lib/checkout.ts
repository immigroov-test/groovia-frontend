// Shared paid-booking flow: quote -> reserve (10-min hold) -> Razorpay order -> Checkout
// -> verify. Used by the mentor booking widget (first booking) AND the session detail page
// (completing payment on an existing unpaid hold). Keeping it in one place means the two
// call sites can never drift apart.
//
// `reserve` reuses the caller's OWN un-expired hold, so retrying after a cancelled popup
// always works; it 409s only when SOMEONE ELSE holds or booked the slot (onSlotTaken).
import { openRazorpayCheckout } from './razorpay';
import { pricingCountry } from './geo';
import { createClient } from './supabase/client';

export interface CheckoutParams {
  mentorId: string;
  serviceId: string;
  slotTime: string;            // ISO slot_start
  email: string;
  phone: string;
  serviceTitle: string;
  name?: string | null;
  notes?: string | null;
  answers?: { question_id: string; answer_text: string }[];
  timezone?: string;
}

export interface CheckoutHandlers {
  onConfirmed: (bookingId: string) => void;   // payment captured, booking confirmed
  onSlotTaken: (message: string) => void;      // someone else took the slot (409)
  onError: (message: string) => void;          // any other failure
  onDismiss?: () => void;                       // user closed the Razorpay window
}

export async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export async function startPaidCheckout(p: CheckoutParams, h: CheckoutHandlers): Promise<void> {
  const tz = p.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
  try {
    // 1. Binding price quote (customer currency + PPP). Honours the ?country= override on staging
    // for testing; in production the backend trusts signed edge geo and ignores it.
    const country = await pricingCountry();
    const qRes = await fetch(`/api/pricing/quote/${p.serviceId}${country ? `?country=${country}` : ''}`, { cache: 'no-store' });
    const quote = await qRes.json().catch(() => ({}));
    if (!qRes.ok || !quote.quote_id) { h.onError(quote.detail || 'Could not price this session. Please try again.'); return; }

    // 2. Reserve a 10-minute payment hold.
    const rRes = await fetch('/api/payments/reserve', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        quote_id: quote.quote_id,
        mentor_id: p.mentorId,
        service_id: p.serviceId,
        slot_time: p.slotTime,
        email: p.email.trim(),
        phone: p.phone.trim(),
        name: p.name?.trim() || null,
        notes: p.notes?.trim() || null,
        timezone: tz,
        answers: p.answers ?? [],
        specific_availability_id: null,
      }),
    });
    const reserved = await rRes.json().catch(() => ({}));
    if (rRes.status === 409) { h.onSlotTaken(reserved.detail || 'This time was just taken. Please choose another slot.'); return; }
    if (!rRes.ok || !reserved.booking_id) { h.onError(reserved.detail || 'That slot is no longer available. Please pick another time.'); return; }
    const bookingId: string = reserved.booking_id;

    // 3. Create the Razorpay order.
    const oRes = await fetch('/api/payments/razorpay/create-order', {
      method: 'POST',
      headers,
      body: JSON.stringify({ booking_id: bookingId }),
    });
    const order = await oRes.json().catch(() => ({}));
    if (!oRes.ok || !order.order_id) { h.onError(order.detail || 'Could not start the payment. Please try again.'); return; }

    // 4. Open Checkout. Outcomes arrive via handler (paid) / ondismiss (cancelled).
    const opened = await openRazorpayCheckout({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: 'Immigroov',
      description: p.serviceTitle,
      prefill: { name: p.name?.trim() || undefined, email: p.email.trim() },
      theme: { color: '#102a4c' },
      handler: async () => {
        // Webhook-independent confirmation: whether or not this lands, the payment is
        // captured and the webhook/sweep finalizes the booking, so we always confirm.
        await fetch('/api/payments/verify', {
          method: 'POST',
          headers,
          body: JSON.stringify({ order_id: order.order_id }),
        }).catch(() => {});
        h.onConfirmed(bookingId);
      },
      modal: { ondismiss: () => { h.onDismiss?.(); } },
    });
    if (!opened) h.onError('Could not load the payment window. Please check your connection and try again.');
  } catch {
    h.onError('Could not complete the payment. Please try again.');
  }
}
