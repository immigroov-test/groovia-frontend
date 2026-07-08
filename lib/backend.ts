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
