import { DataSubjectRequestForm } from '../../../../components/DataSubjectRequestForm';

export const metadata = { title: 'Make a data request - Immigroov' };

// Section 7 — "not a consent doc, a rights-exercise page." Public, no auth required:
// exercising your rights must not itself require an account. Linked from the Data
// Subject Rights section on /privacy, from account settings for signed-in users, and
// from a persistent link for signed-out visitors (see components/CookieConsent.tsx's
// sibling link and TopNav's user menu).
export default function DataSubjectRequestPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-brand-900">Make a data request</h1>
      <p className="text-sm text-muted mt-2">
        Use this form to access, correct, delete, or export your personal data, or to exercise any
        other right described in our{' '}
        <a href="/privacy#data-subject-rights" className="text-brand-700 hover:underline">Data Subject Rights</a>{' '}
        document. We&apos;ll verify your identity by email before acting on the request.
      </p>

      <div className="mt-8">
        <DataSubjectRequestForm />
      </div>
    </div>
  );
}
