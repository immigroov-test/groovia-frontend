// Lazy-loads Razorpay's hosted Checkout script and opens the modal. The script
// is injected on first use (never in the initial bundle) and cached thereafter.

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

// Minimal shape of the Razorpay Checkout options we use.
export interface RazorpayCheckoutOptions {
  key: string;
  order_id: string;
  amount: number;        // minor units (paise/cents) — matches the order
  currency: string;
  name: string;          // brand shown on the modal
  description?: string;
  prefill?: { name?: string; email?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
}

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    // The Razorpay constructor injected by the hosted script.
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

let loadPromise: Promise<boolean> | null = null;

export function loadRazorpay(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (loadPromise) return loadPromise;
  loadPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(!!window.Razorpay));
      existing.addEventListener('error', () => resolve(false));
      if (window.Razorpay) resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(!!window.Razorpay);
    script.onerror = () => { loadPromise = null; resolve(false); };
    document.body.appendChild(script);
  });
  return loadPromise;
}

// Opens the Checkout modal. Resolves false if the script couldn't load (caller
// should surface a "payment unavailable" message); the success/dismiss outcomes
// are delivered via the options.handler / options.modal.ondismiss callbacks.
export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<boolean> {
  const ok = await loadRazorpay();
  if (!ok || !window.Razorpay) return false;
  const rzp = new window.Razorpay(options);
  rzp.open();
  return true;
}
