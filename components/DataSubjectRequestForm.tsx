'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const REQUEST_TYPES: { value: string; label: string }[] = [
  { value: 'access', label: 'Access my data' },
  { value: 'rectification', label: 'Correct my data' },
  { value: 'erasure', label: 'Delete my data' },
  { value: 'portability', label: 'Export my data' },
  { value: 'other', label: 'Something else' },
];

/** Section 7 — "not a consent doc, a rights-exercise page." This is intake only: it
 * files a ticket and notifies admins. Fulfillment (verifying identity, actually
 * exporting or deleting data) happens outside this form, by the team - the spec's own
 * caution is that this must route to a real mechanism, not stand alone as an explainer
 * with nowhere for the request to actually go.
 *
 * Public: exercising your rights must not itself require an account. */
export function DataSubjectRequestForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [requestType, setRequestType] = useState('access');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      const res = await fetch('/api/legal/data-subject-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), request_type: requestType, details: details.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.detail || 'Could not submit your request. Please try again.');
        return;
      }
      setDone(true);
    } catch {
      setError('Could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-[--color-border] bg-card px-6 py-8 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <Check className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-medium text-brand-900">Your request has been submitted.</p>
        <p className="mt-1 text-sm text-muted">We&apos;ll follow up at {email} to verify your identity and confirm next steps.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-[--color-border] bg-card p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Name" />
        <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" aria-label="Email" />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground" htmlFor="dsr-type">What would you like to do?</label>
        <select
          id="dsr-type"
          value={requestType}
          onChange={(e) => setRequestType(e.target.value)}
          className="mt-1.5 w-full h-11 px-3 rounded-xl bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]"
        >
          {REQUEST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground" htmlFor="dsr-details">Details (optional)</label>
        <textarea
          id="dsr-details"
          rows={4}
          maxLength={5000}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Anything that helps us handle your request"
          className="mt-1.5 w-full px-3 py-2 rounded-xl bg-white text-sm resize-y shadow-[0_0_0_1px_rgba(15,23,42,0.08)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" variant="accent" loading={submitting} disabled={!name.trim() || !email.trim()}>
        Submit request
      </Button>
    </form>
  );
}
