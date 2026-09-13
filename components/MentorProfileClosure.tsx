'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EyeOff, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Button } from './ui/Button';
import { Card, CardBody } from './ui/Card';
import { ConfirmDialog } from './ui/ConfirmDialog';

// FEAT-020: a mentor closing or reopening their own profile.
//
// Two states, deliberately NOT the admin 'suspended' one. Deactivating used to set that, and the
// hub renders suspended as a dead end telling the mentor to contact support - so pausing your own
// profile locked you out of restoring it.
//   deactivated      - paused. Hidden from customers, reactivate whenever, nothing is deleted.
//   deletion_pending - leaving. Hidden, restorable for a grace window, then the profile is deleted.
//
// Confirmed sessions are honoured either way, so the count is shown BEFORE anything is confirmed:
// hiding a profile does not release the mentor from sessions people have already paid for.

async function authedFetch(path: string, method = 'GET', body?: object) {
  const { data: { session } } = await createClient().auth.getSession();
  const res = await fetch(path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || `HTTP ${res.status}`);
  return data;
}

interface Status {
  status: string;
  purge_due_at: string | null;
  grace_days: number;
  upcoming_sessions: number;
}

const longDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '';

const daysLeft = (iso: string | null) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
};

/** The "sessions you still owe" line, shared by both dialogs. */
function SessionsNote({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <p className="text-amber-700">
      {/* The {' '} is load-bearing: JSX trims per-line whitespace on a text chunk that spans a line
          break, so a bare space after the expression is dropped and this reads "Theywill". */}
      You have <strong>{n} session{n === 1 ? '' : 's'}</strong> already booked. {n === 1 ? 'It' : 'They'}{' '}
      will still go ahead and you are expected to attend &mdash; hiding your profile only stops new bookings.
    </p>
  );
}

// ── Danger zone: shown on the Profile tab of a live profile ───────────────────

export function MentorProfileClosure() {
  const router = useRouter();
  const [info, setInfo] = useState<Status | null>(null);
  const [dialog, setDialog] = useState<'deactivate' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await authedFetch('/api/mentor/deactivation');
        // Only the session count comes from here; a failure leaves the actions below working.
        if (!cancelled) setInfo(data);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  async function close(deleteProfile: boolean) {
    setBusy(true); setError(null);
    try {
      await authedFetch('/api/mentor/deactivate', 'POST', { delete: deleteProfile });
      setDialog(null);
      router.refresh();          // the hub reads `mentor` from the server component
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update your profile.');
    } finally { setBusy(false); }
  }

  const sessions = info?.upcoming_sessions ?? 0;
  const graceDays = info?.grace_days ?? 90;

  return (
    <Card>
      <CardBody className="pt-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Close your profile</h2>
          <p className="text-sm text-muted mt-0.5">
            Take a break, or leave Immigroov for good. Either way your profile stops appearing to
            customers straight away.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => { setError(null); setDialog('deactivate'); }}>
            <EyeOff className="h-3.5 w-3.5" /> Deactivate
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setError(null); setDialog('delete'); }}
            className="text-red-600 border-red-200 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" /> Delete profile
          </Button>
        </div>

        <ConfirmDialog
          open={dialog === 'deactivate'}
          title="Deactivate your profile?"
          confirmLabel="Deactivate"
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={() => close(false)}
          body={
            <div className="flex flex-col gap-2">
              <p>Your profile is hidden from customers and you stop receiving new bookings.</p>
              <SessionsNote n={sessions} />
              <p>Nothing is deleted. You can reactivate whenever you like.</p>
            </div>
          }
        />

        <ConfirmDialog
          open={dialog === 'delete'}
          title="Delete your profile?"
          confirmLabel="Delete my profile"
          busy={busy}
          // The safer path the person may not have considered - the whole reason ConfirmDialog
          // takes an alternate rather than a bare Cancel.
          alternateLabel="Deactivate instead"
          onAlternate={() => setDialog('deactivate')}
          onClose={() => setDialog(null)}
          onConfirm={() => close(true)}
          body={
            <div className="flex flex-col gap-2">
              <p>Your profile is hidden from customers immediately.</p>
              <SessionsNote n={sessions} />
              <p>
                You have <strong>{graceDays} days</strong> to change your mind and restore it. After that your
                profile details are permanently deleted and you would have to start a new profile from scratch.
              </p>
              <p className="text-muted">
                Your past sessions, payments and payouts are kept as business records either way.
              </p>
            </div>
          }
        />
      </CardBody>
    </Card>
  );
}

// ── Restore: shown INSTEAD of the hub once the profile is closed ──────────────

export function MentorProfileClosedCard({ status, purgeDueAt }: { status: string; purgeDueAt?: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const leaving = status === 'deletion_pending';
  const left = daysLeft(purgeDueAt ?? null);

  async function restore() {
    setBusy(true); setError(null);
    try {
      await authedFetch('/api/mentor/reactivate', 'POST');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not restore your profile.');
    } finally { setBusy(false); }
  }

  return (
    <Card>
      <CardBody className="pt-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {leaving ? 'Your profile is scheduled for deletion' : 'Your profile is deactivated'}
          </h2>
          <p className="text-sm text-muted mt-1">
            {leaving ? (
              <>
                It is hidden from customers and taking no new bookings.
                {purgeDueAt && (
                  <> Restore it before <strong className="text-foreground">{longDate(purgeDueAt)}</strong>
                    {left !== null && <> ({left} day{left === 1 ? '' : 's'} left)</>} and everything comes back
                    exactly as it was. After that date your profile details are permanently deleted.</>
                )}
              </>
            ) : (
              <>It is hidden from customers and taking no new bookings. Nothing has been deleted &mdash;
                reactivate whenever you are ready and it comes back exactly as it was.</>
            )}
          </p>
        </div>
        <p className="text-xs text-muted">
          Sessions that were already booked are unaffected and still go ahead.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button variant="accent" onClick={restore} loading={busy} className="self-start">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          {leaving ? 'Restore my profile' : 'Reactivate my profile'}
        </Button>
      </CardBody>
    </Card>
  );
}
