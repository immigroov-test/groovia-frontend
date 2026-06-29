import { notFound } from 'next/navigation';
import { PreviewGallery } from './PreviewGallery';

export const metadata = { title: 'Preview — Immigroov (design)', robots: 'noindex' };

// Dev/design-only page gallery. Renders every page/state with mock data so you can
// review the look without running flows or signing in. Enabled by default; set
// NEXT_PUBLIC_FEATURE_PREVIEW=false on the real production project to hide it.
export default function PreviewPage() {
  if (process.env.NEXT_PUBLIC_FEATURE_PREVIEW === 'false') notFound();
  return <PreviewGallery />;
}
