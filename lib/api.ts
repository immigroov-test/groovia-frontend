import { createClient } from './supabase/client';
import { trackWake } from './backendWake';

// Client-side fetch that attaches the current Supabase session token. Every component
// was repeating: getSession() -> build Authorization header -> fetch -> res.json().
// Use this instead so calling a BFF endpoint from the browser is one call.
//
//   const { ok, status, data } = await apiFetch('/api/mentor/availability');
//   const res = await apiFetch('/api/mentor/signup', { method: 'POST', json: payload });
export interface ApiResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

interface ApiOptions extends Omit<RequestInit, 'body'> {
  json?: unknown;          // serialized to a JSON body with the right Content-Type
  body?: BodyInit;         // escape hatch for non-JSON bodies
}

export async function apiFetch<T = unknown>(path: string, opts: ApiOptions = {}): Promise<ApiResult<T>> {
  const { json, headers, ...rest } = opts;
  const { data: { session } } = await createClient().auth.getSession();

  const finalHeaders: Record<string, string> = { ...(headers as Record<string, string>) };
  if (session?.access_token) finalHeaders.Authorization = `Bearer ${session.access_token}`;

  let body = opts.body;
  if (json !== undefined) {
    body = JSON.stringify(json);
    finalHeaders['Content-Type'] = 'application/json';
  }

  // trackWake raises the cold-start overlay if this call stays unanswered past the threshold, and
  // lowers it however the call ends. Wrapping here covers every caller at once.
  const res = await trackWake(() => fetch(path, { ...rest, headers: finalHeaders, body }));
  let parsed: unknown = null;
  try { parsed = await res.json(); } catch { /* empty/non-JSON response */ }
  return { ok: res.ok, status: res.status, data: parsed as T };
}
