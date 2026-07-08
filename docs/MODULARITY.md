# Modularity review and conventions

A quick review of how the frontend is structured and the patterns to follow when
adding pages or features, so the codebase stays easy to extend.

## What is already modular (keep doing this)

- **UI primitives** live in `components/ui/` (`Button`, `Input`, `Card`, `MultiSelect`,
  `PhotoUpload`, `RichTextEditor`, `Flag`, ...). Compose these, do not restyle raw
  elements per page.
- **Copy is centralized** in `lib/content.ts` (`UI_CONTENT`). Legal text lives in
  `content/legal/*.md` and renders through `components/LegalDoc.tsx`.
- **Static data** is isolated: `lib/countries.ts`, `lib/languages.ts`, `lib/phoneCodes.ts`,
  `lib/countryTimezones.ts`.
- **Feature flags** are one place: `lib/features.ts` (`FEATURES.*`, from `NEXT_PUBLIC_*`).
- **The BFF boundary is consistent**: the browser never calls the backend or the DB
  directly. It calls `app/api/**` routes, which forward to FastAPI. Pages/components
  only ever read `profiles` directly (RLS), plus Supabase auth and storage.

## What was repetitive (now fixed with two helpers)

### 1. BFF routes: `proxyToBackend` (`lib/backend.ts`)
All 50 routes in `app/api/**` repeated the same block: check the auth header, `fetch`
the backend with `cache:'no-store'`, pass JSON + status back, 502 on failure. A new
route is now one line:

```ts
// app/api/mentor/availability/route.ts
import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/backend';

export const GET  = (req: NextRequest) => proxyToBackend(req, '/mentor/availability');
export const POST = (req: NextRequest) => proxyToBackend(req, '/mentor/availability');
```

With a dynamic segment:

```ts
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/admin/mentors/${id}/approve`, { method: 'POST' });
}
```

Migrated as exemplars: `mentor/availability`, `admin/mentors/[id]/approve`,
`admin/mentors/[id]/reject`. The remaining pure-proxy routes can adopt the same
one-liner incrementally (routes with custom logic, e.g. `auth/check-email`,
`auth/verify-recaptcha`, and any streaming route, stay hand-written).

### 2. Client calls: `apiFetch` (`lib/api.ts`)
Components repeated: `getSession()` -> build `Authorization` header -> `fetch` ->
`res.json()`. Use `apiFetch`, which attaches the session token for you:

```ts
const { ok, data } = await apiFetch<{ detail?: string }>('/api/mentor/availability', {
  method: 'POST',
  json: { slots, session_duration_minutes: duration, availability_type: 'manual' },
});
if (!ok) setError(data?.detail ?? 'Save failed.');
```

## Adding a new feature (checklist)

1. **Backend**: add the endpoint in `groovia-backend/routers/<area>.py`; put DB access
   in `db/<area>.py`. Keep routers thin, DB logic in `db`.
2. **BFF**: add `app/api/<path>/route.ts` using `proxyToBackend`.
3. **Client**: call it with `apiFetch`; render with `components/ui/*`.
4. **Copy**: user-facing strings go in `lib/content.ts`, not inline.
5. **Responsive**: every screen works on mobile and desktop.
6. **No em-dashes** anywhere.

## Still worth doing later (not blocking)

- Migrate the remaining ~45 pure-proxy routes to `proxyToBackend`.
- Extract a small `useApi` hook for the common loading/error/data state that list
  components (`AdminBookings`, `BookingManager`, `ServicesManager`) each re-implement.
- Extract a shared `Loading` inline spinner (repeated as `<Loader2 className="animate-spin"/> Loading...`).
