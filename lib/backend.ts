// BACKEND_URL should be just the origin (e.g. http://localhost:8000), no path.
import { NextRequest, NextResponse } from 'next/server';

if (process.env.NODE_ENV === 'production' && !process.env.BACKEND_URL) {
  console.error('[FATAL] BACKEND_URL env var is not set in production');
}

export function backendBaseUrl(): string {
  const raw = process.env.BACKEND_URL || 'http://localhost:8000';
  // Strip trailing path in case BACKEND_URL=http://host/chat was set.
  return raw.replace(/\/(chat|mentors)\/?$/, '').replace(/\/$/, '');
}

interface ProxyOptions {
  method?: string;        // defaults to the incoming request's method
  forwardBody?: boolean;  // defaults to true for non-GET/HEAD
  headers?: Record<string, string>;  // extra headers to add on the backend call (e.g. edge geo)
}

export interface ServerGetResult<T = unknown> {
  ok: boolean;
  status: number; // 0 = network failure / timeout (backend unreachable), NOT a real HTTP status
  data: T | null;
}

// Resilient server-side GET for Server Components. NEVER throws (a thrown fetch in an
// RSC crashes the whole page to a blank screen), and times out instead of hanging on a
// cold-starting backend. Callers distinguish 404 (resource absent) from 0 (backend down)
// so they don't, e.g., redirect an existing mentor to onboarding during a cold start.
export async function serverGet<T = unknown>(
  path: string,
  token: string | null,
  timeoutMs = 12000,
): Promise<ServerGetResult<T>> {
  if (!token) return { ok: false, status: 401, data: null };
  try {
    const res = await fetch(`${backendBaseUrl()}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    let data: T | null = null;
    try { data = (await res.json()) as T; } catch { /* empty/non-JSON body */ }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

// Public (guest-allowed) forwarder: same as proxyToBackend but does NOT require an
// auth header. If one is present it's still forwarded (so the backend can link the
// booking to a signed-in candidate); if absent the request proceeds as a guest.
// Used by the payments/pricing routes, which must work for guests mid-checkout.
export async function proxyPublic(
  req: NextRequest,
  backendPath: string,
  opts: ProxyOptions = {},
): Promise<NextResponse> {
  const method = opts.method ?? req.method;
  const sendBody = opts.forwardBody ?? (method !== 'GET' && method !== 'HEAD');

  const authHeader = req.headers.get('authorization');
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (authHeader) headers.Authorization = authHeader;
  let body: string | undefined;
  if (sendBody) {
    const text = await req.text();
    if (text) {
      body = text;
      headers['Content-Type'] = 'application/json';
    }
  }

  try {
    const res = await fetch(`${backendBaseUrl()}${backendPath}`, {
      method, headers, body, cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}

// Forward a browser request to the FastAPI backend with the caller's bearer token.
// Every BFF route in app/api/** is the same shape: require an auth header, call the
// backend with cache:'no-store', pass the JSON + status straight back, and return a
// 502 if the backend is unreachable. This collapses that boilerplate to one line:
//   export const GET = (req: NextRequest) => proxyToBackend(req, '/mentor/availability');
export async function proxyToBackend(
  req: NextRequest,
  backendPath: string,
  opts: ProxyOptions = {},
): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const method = opts.method ?? req.method;
  const sendBody = opts.forwardBody ?? (method !== 'GET' && method !== 'HEAD');

  const headers: Record<string, string> = { Authorization: authHeader };
  let body: string | undefined;
  if (sendBody) {
    const text = await req.text();
    // Only forward a real body. An empty POST (e.g. approve/reject with no payload)
    // is sent without a JSON content-type so FastAPI applies its Pydantic defaults
    // instead of failing to parse an empty string as JSON.
    if (text) {
      body = text;
      headers['Content-Type'] = 'application/json';
    }
  }

  try {
    const res = await fetch(`${backendBaseUrl()}${backendPath}`, { method, headers, body, cache: 'no-store' });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
