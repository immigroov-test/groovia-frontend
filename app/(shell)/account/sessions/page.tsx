import { BookingManager } from '../../../../components/BookingManager';

export const metadata = { title: 'My sessions - Immigroov',
  // BUG-144: private page. robots.txt stops the crawl, but a Disallow does not prevent
  // INDEXING: Google can list a URL it found elsewhere, showing a bare result with no description.
  // noindex is the directive that actually keeps it out.
  robots: { index: false, follow: false },
};

export default function AccountSessionsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 reveal-children">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-900">My sessions</h1>
      <p className="text-sm text-muted mt-1">
        Manage your bookings - reschedule, cancel, or report a no-show.
      </p>
      <div className="mt-8">
        <BookingManager role="mentee" />
      </div>
    </div>
  );
}
