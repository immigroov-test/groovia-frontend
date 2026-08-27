import { Suspense } from 'react';
import { ContactContent } from '../../../components/ContactContent';

export const metadata = {
  title: 'Contact - Immigroov',
  description: 'Get in touch with the Immigroov team.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  // The form reads ?topic / ?message (BUG-067), so it needs a Suspense boundary to prerender.
  return (
    <Suspense>
      <ContactContent />
    </Suspense>
  );
}
