import { AuthCallbackClient } from '../../../components/AuthCallbackClient';

// Only allow same-origin relative paths - blocks open redirects like //evil.com.
function safeNext(next: string | string[] | undefined): string {
  const v = Array.isArray(next) ? next[0] : next;
  if (!v || !v.startsWith('/') || v.startsWith('//')) return '/home';
  return v;
}

function first(v: string | string[] | undefined): string | null {
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; token_hash?: string; type?: string; next?: string }>;
}) {
  const sp = await searchParams;
  return (
    <AuthCallbackClient
      code={first(sp.code)}
      tokenHash={first(sp.token_hash)}
      type={first(sp.type)}
      next={safeNext(sp.next)}
    />
  );
}
