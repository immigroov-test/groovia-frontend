// Free-tier Render spins the backend down after a spell of no traffic, and the next request pays a
// cold start of up to a minute. Without this the user sees a button that did nothing, so they press
// it again, and the honest explanation ("the server is starting up") never reaches them.
//
// A tiny pub/sub rather than context: apiFetch is a plain async function, not a hook, so it cannot
// read context. Anything can publish here and the overlay is the only subscriber.

/** Wait this long before blaming a cold start. A warm backend answers well inside this, so normal
 *  slowness never triggers the overlay. */
export const WAKE_THRESHOLD_MS = 2500;

/** How long we tell the user to expect, in seconds. Set per environment on Vercel:
 *  staging idles more and sleeps harder, so it gets a longer number than production. */
export const COLD_START_SECONDS =
  Number(process.env.NEXT_PUBLIC_COLD_START_SECONDS) || 60;

type Listener = (waking: boolean) => void;

const listeners = new Set<Listener>();
let pendingSlow = 0;          // how many in-flight requests have passed the threshold
let waking = false;

function publish(next: boolean) {
  if (next === waking) return;
  waking = next;
  listeners.forEach((l) => l(waking));
}

export function subscribeWake(l: Listener): () => void {
  listeners.add(l);
  l(waking);
  return () => { listeners.delete(l); };
}

export function isWaking(): boolean { return waking; }

/** Wrap a request so a slow one raises the overlay and any outcome lowers it.
 *  Reference-counted, so parallel requests do not fight over it. */
export async function trackWake<T>(run: () => Promise<T>): Promise<T> {
  let counted = false;
  const timer = setTimeout(() => { counted = true; pendingSlow += 1; publish(true); }, WAKE_THRESHOLD_MS);
  try {
    return await run();
  } finally {
    clearTimeout(timer);
    if (counted) {
      pendingSlow = Math.max(0, pendingSlow - 1);
      if (pendingSlow === 0) publish(false);
    }
  }
}
