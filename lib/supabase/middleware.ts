// Supabase session refresh helper - runs on every matched request via middleware.ts.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // The whole body is wrapped: a middleware throw becomes a site-wide 500
  // (MIDDLEWARE_INVOCATION_FAILED) on EVERY matched route. We never want that -
  // worst case we degrade to "guest" and let page-level guards handle auth.
  try {
    return await refreshSession(request);
  } catch (err) {
    console.error('[middleware] fatal error; passing request through as guest:', err);
    return NextResponse.next({ request });
  }
}

async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase config we can't refresh a session. Degrade to guest.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '[middleware] Missing Supabase env vars - NEXT_PUBLIC_SUPABASE_URL/ANON_KEY not inlined at build time. Treating request as guest.',
    );
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: call getUser() (not getSession) - it revalidates the token with Supabase Auth.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // '/' SERVES the home page rather than redirecting to /home. A bare immigroov.com is what gets
  // pasted into social posts and messages, and a redirect hop costs link previews: some scrapers do
  // not follow it, and those that do fetch the destination's tags rather than the URL the user sees.
  // /home stays a working route, so existing links and email CTAs are unaffected.

  // /account is auth-only. /mentor is public - guests see the "Join as Mentor" signup form.
  if (!user && path.startsWith('/account')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  // Logged-in users shouldn't see auth pages anymore - send them to chat.
  const guestOnlyPaths = ['/login', '/signup', '/forgot-password'];
  if (user && guestOnlyPaths.includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    return NextResponse.redirect(url);
  }

  return response;
}
