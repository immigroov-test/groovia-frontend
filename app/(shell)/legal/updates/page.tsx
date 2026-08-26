import { redirect } from 'next/navigation';
import { serverAuth } from '../../../../lib/supabase/server';
import { serverGet } from '../../../../lib/backend';
import { PageLoadError } from '../../../../components/PageLoadError';
import { LegalUpdatesReview, type PendingLegalDocument } from '../../../../components/LegalUpdatesReview';

export const metadata = {
  title: 'Legal Documents Updated - Immigroov',
  robots: { index: false, follow: false },
};

// Landing page for the "Legal document updated" notice's Review button: every
// applicable, unacknowledged document in one place, behind one acknowledgement.
// See LegalUpdatesReview for why one click is the right amount of friction here.
export default async function LegalUpdatesPage() {
  const { user, token } = await serverAuth();
  if (!user || !token) redirect('/login?next=/legal/updates');

  const res = await serverGet<PendingLegalDocument[]>('/legal/pending/full', token);
  // Guard on Array.isArray, not just res.ok: a 500 (say, a missing database function)
  // still arrives with ok:false and a JSON object body ({detail: "..."}), and
  // LegalUpdatesReview calls .map() on `docs` directly with no defensive check of its
  // own - passing that object through crashes the whole page instead of showing an
  // error. This is the bug that produced the blank "Something went wrong" page.
  if (!res.ok || !Array.isArray(res.data)) return <PageLoadError retryHref="/legal/updates" />;

  const docs = res.data;
  // Nothing pending: someone navigated here directly, or acknowledged elsewhere in
  // another tab. /legal is the right landing spot either way, not an empty page.
  if (docs.length === 0) redirect('/legal');

  return <LegalUpdatesReview docs={docs} />;
}
