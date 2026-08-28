import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { serverAuth } from '../../../lib/supabase/server';
import { serverGet } from '../../../lib/backend';
import { PageLoadError } from '../../../components/PageLoadError';

export const metadata = {
  title: 'Legal Documents - Immigroov',
  // Which documents this page lists depends on who is signed in, so there is no
  // single version of it to index. The public /terms and /privacy pages are the
  // indexable ones.
  robots: { index: false, follow: false },
};

interface UserDoc {
  document_id: string;
  code: string;
  slug: string;
  title: string;
  summary: string | null;
  audience_label: string;
  version_id: string;
  version: string;
  last_updated: string;
  acknowledged: boolean;
}

function when(ts: string): string {
  return new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

// The documents that apply to THIS user, by role and region. A customer never sees
// the mentor contracts, and an India-based customer sees the India T&C rather than
// the Rest-of-World one - all decided server-side, so the list cannot be widened
// from the browser.
export default async function LegalIndexPage() {
  const { user, token } = await serverAuth();
  if (!user || !token) redirect('/login?next=/legal');

  const res = await serverGet<UserDoc[]>('/legal/documents', token);
  // A failed response is not necessarily status 0 (backend unreachable): a 500 from
  // a genuine backend/database error still arrives as ok:false with a JSON body like
  // {detail: "..."} - an OBJECT, not an array. Checking Array.isArray rather than just
  // `res.data ?? []` is what stops that object reaching .reduce() below and crashing
  // the page; any non-array response shows the same retry page as an unreachable backend.
  if (!res.ok || !Array.isArray(res.data)) return <PageLoadError retryHref="/legal" />;
  const docs = res.data;

  const groups = docs.reduce<Record<string, UserDoc[]>>((acc, d) => {
    (acc[d.audience_label] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-900">Terms &amp; Policies</h1>
      <p className="text-sm text-muted mt-2">
        The current version of every document that applies to your account.
      </p>

      {docs.length === 0 && (
        <p className="text-sm text-muted mt-8">No legal documents have been published yet.</p>
      )}

      {Object.entries(groups).map(([label, items]) => (
        <section key={label} className="mt-8">
          <h2 className="text-sm font-medium text-muted">{label}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {items.map((d) => (
              <Link key={d.document_id} href={`/legal/${d.slug}`}
                className="group flex items-center gap-4 rounded-2xl border border-[--color-border] bg-card px-5 py-4 hover:border-brand-300 hover:bg-brand-50/40 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-brand-900">{d.title}</p>
                  {d.summary && <p className="text-sm text-muted mt-0.5">{d.summary}</p>}
                  <p className="text-xs text-muted/80 mt-1 tabular-nums">
                    {d.version} · Last updated {when(d.last_updated)}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted group-hover:text-brand-700" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
