// Server-side Supabase client for Server Components, Server Actions, Route Handlers.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components can't set cookies - middleware does it.
          }
        },
      },
    },
  );
}

// Authenticate the request on the server. Uses getUser() (revalidates the token with
// Supabase Auth) instead of getSession() (reads the cookie unverified - insecure on the
// server, and the source of the console warning). Also returns the access token, read
// from getSession() but ONLY for its .access_token (never .user), so no warning fires.
export async function serverAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let token: string | null = null;
  if (user) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token ?? null;
  }
  return { supabase, user, token };
}
