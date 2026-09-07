import { notFound, redirect } from 'next/navigation';
import { serverAuth } from '../../../../lib/supabase/server';
import { serverGet } from '../../../../lib/backend';
import { PageLoadError } from '../../../../components/PageLoadError';
import { LegalDocumentView } from '../../../../components/LegalDocumentView';

export const metadata = {
  title: 'Legal Document - Immigroov',
  robots: { index: false, follow: false },
};

export interface UserLegalDocument {
  document_id: string;
  code: string;
  slug: string;
  title: string;
  summary: string | null;
  audience_label: string;
  version_id: string;
  version: string;
  last_updated: string;
  content: string;
  acknowledged: boolean;
}

// One document, read-only, with the acknowledgement control.
//
// The 404 here is doing real work: the backend resolves the slug against the
// documents that apply to THIS user, so a customer opening /legal/mentor-agreement
// gets the same answer as for a slug that does not exist. There is no id in the URL
// that could be swapped to read someone else's contract.
export default async function LegalDocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, token } = await serverAuth();
  if (!user || !token) redirect(`/login?next=/legal/${encodeURIComponent(slug)}`);

  const res = await serverGet<UserLegalDocument>(`/legal/documents/${encodeURIComponent(slug)}`, token);
  if (!res.ok && res.status === 0) return <PageLoadError retryHref={`/legal/${slug}`} />;
  if (!res.ok || !res.data?.version_id) notFound();

  return <LegalDocumentView doc={res.data} />;
}
