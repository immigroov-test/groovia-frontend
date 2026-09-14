import { BookingManager } from '../../../../components/BookingManager';
import { AppPageHeader } from '../../../../components/ui/AppPageHeader';

export const metadata = { title: 'My sessions - Immigroov',
  // BUG-144: private page. robots.txt stops the crawl, but a Disallow does not prevent
  // INDEXING: Google can list a URL it found elsewhere, showing a bare result with no description.
  // noindex is the directive that actually keeps it out.
  robots: { index: false, follow: false },
};

export default function AccountSessionsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 reveal-children">
      <AppPageHeader eyebrow="Your account" title="My sessions" description="Join, reschedule, or cancel your bookings, and review past sessions." />
      <div className="mt-8">
        <BookingManager role="mentee" />
      </div>
    </div>
  );
}
