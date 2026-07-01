'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PREVIEWS } from '../PreviewGallery';
import { MockFetch } from '../MockFetch';

// Renders a single preview full-bleed. Loaded inside the gallery's <iframe> so that
// responsive breakpoints react to the iframe width (true mobile/desktop preview).
function FrameInner() {
  const i = Number(useSearchParams().get('i') ?? 0);
  const preview = PREVIEWS[i] ?? PREVIEWS[0];
  return (
    <MockFetch>
      <div className="min-h-screen bg-background">{preview.node}</div>
    </MockFetch>
  );
}

export default function PreviewFrame() {
  return (
    <Suspense fallback={null}>
      <FrameInner />
    </Suspense>
  );
}
