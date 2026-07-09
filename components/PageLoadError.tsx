// Shown by server pages when the backend is unreachable (e.g. a cold start), instead of
// letting an unguarded fetch throw and crash the route to a blank screen.
export function PageLoadError({
  retryHref,
  title = "We couldn't load this page",
  message = 'The server took too long to respond. This can happen after a period of inactivity. Please try again in a moment.',
}: {
  retryHref: string;
  title?: string;
  message?: string;
}) {
  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-20 text-center">
      <h1 className="text-xl font-semibold text-brand-900">{title}</h1>
      <p className="text-sm text-muted mt-2">{message}</p>
      <a
        href={retryHref}
        className="mt-5 inline-flex items-center h-10 px-5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
      >
        Try again
      </a>
    </div>
  );
}
