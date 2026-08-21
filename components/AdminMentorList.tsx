'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { RichText } from './ui/RichText';
// Session descriptions are rich text, but in a dense list full markup blows out the row height and
// makes it harder to scan. Plain text keeps the list readable while still showing what was written.
import { richTextToPlain } from '../lib/sanitizeHtml';
import type { CurrencyRate } from '../lib/pricing';
import { UI_CONTENT } from '../lib/content';
import { COUNTRIES } from '../lib/countries';
import { LANGUAGES } from '../lib/languages';
import type { AdminMentor } from '../app/(shell)/admin/page';

const COUNTRY_MAP = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.name]));
const LANGUAGE_MAP = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.name]));
const SOCIAL_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn', youtube: 'YouTube', instagram: 'Instagram',
  twitter: 'X (Twitter)', website: 'Website', github: 'GitHub', facebook: 'Facebook',
};

type Action = 'approve' | 'reject' | 'request-changes' | 'suspend' | 'reinstate';

// Actions that ask the reviewer for a note before firing (shown to the mentor).
const COMMENT_ACTIONS: Record<string, { title: string; hint: string; placeholder: string; confirm: string }> = {
  reject: {
    title: 'Reason for declining',
    hint: 'shown to the applicant',
    placeholder: "e.g. We're unable to verify the experience described. You're welcome to re-apply with more detail.",
    confirm: 'Confirm decline',
  },
  'request-changes': {
    title: 'What should the mentor change?',
    hint: 'shown in their dashboard',
    placeholder: 'e.g. Please add specifics on the visa types you have direct experience with, and expand your bio.',
    confirm: 'Send request',
  },
};

// Actions that live at the bottom of "View details" and open a confirmation popup before firing
// (a destructive step the reviewer should see the full profile before taking).
const CONFIRM_ACTIONS: Record<string, { label: string; confirm: string; body: (name: string) => string }> = {
  suspend: {
    label: 'Suspend mentor',
    confirm: 'Suspend mentor',
    body: (name) => `${name} will be hidden from the site and can take no new bookings. Both the mentor and the admin team will be emailed.`,
  },
};

function money(amount?: number | null, currency?: string | null): string {
  if (amount == null) return '';
  if (amount === 0) return 'Free';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency || ''}`.trim();
  }
}

interface ActionConfig {
  action: Action;
  label: string;
  variant: 'accent' | 'outline' | 'primary' | 'secondary' | 'ghost';
  loadingKey: string;
}

interface MaskedBank {
  has_details: boolean;
  country_code?: string;
  scheme?: string;
  account_holder_name?: string;
  bank_name?: string | null;
  account_last4?: string;
  account_masked?: string;
}

interface WeeklySlot { id: string; weekday: string; start_time: string; end_time: string; timezone?: string | null }
interface DateOverride { id: string; slot_date: string; start_time: string | null; end_time: string | null; is_blackout: boolean }
// FEAT-018: description was already returned by the API and simply never typed or rendered, so an
// admin reviewing a new mentor could see a session's title and price but not what it actually offers.
interface ServiceItem { id: string; title: string; duration: number; is_active: boolean; status: string; set_price?: number | null; set_currency?: string | null; is_ppp?: boolean; description?: string | null }
interface AvailabilityRules { days_ahead?: number; min_notice_hours?: number; cancel_hours?: number; timezone?: string }
interface SocialLink { type: string; url: string }

interface MentorDetail extends AdminMentor {
  bio?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  home_country_code?: string | null;
  timezone?: string | null;
  expertise_country_codes?: string[];
  expertise_categories?: string[];
  languages?: string[];
  professional_domains?: string[];
  years_lived_experience?: number | null;
  years_professional_experience?: number | null;
  public_notes?: string | null;
  session_duration_minutes?: number | null;
  app_buffertime?: string | null;
  app_cancellation_policy?: string | null;
  app_reschedule_policy?: string | null;
  booking_url?: string | null;
  avg_rating?: number | null;
  review_count?: number | null;
  // BUG-146: the mentor sets these at registration and every session price is derived from them, but
  // the admin could only see the derived per-session figures. get_mentor_full_details already returns
  // them (it selects *), so this was purely a rendering gap.
  hourly_rate?: number | null;
  currency?: string | null;
  currency_rates?: CurrencyRate[] | null;
  smart_pricing?: boolean | null;
  social_links?: SocialLink[];
  weekly_availability?: WeeklySlot[];
  services?: ServiceItem[];
  availability_rules?: AvailabilityRules | null;
  date_overrides?: DateOverride[];
  bank?: MaskedBank | null;
}

interface Props {
  initialMentors: AdminMentor[];
  actions: ActionConfig[];
  removeOnAction?: boolean;
}

const fmtTime = (t?: string | null) => (t ? t.slice(0, 5) : '');
const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
// Postgres INTERVAL comes back as 'HH:MM:SS' (or plain text) — show it as minutes.
const fmtInterval = (v?: string | null) => {
  if (!v) return '';
  const m = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(v);
  return m ? `${+m[1] * 60 + +m[2]} min` : v;
};

export function AdminMentorList({ initialMentors, actions, removeOnAction = true }: Props) {
  const router = useRouter();
  const [mentors, setMentors] = useState(initialMentors);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [details, setDetails] = useState<Record<string, MentorDetail | null>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});
  const [commentFor, setCommentFor] = useState<{ id: string; action: Action } | null>(null);
  const [confirmFor, setConfirmFor] = useState<{ id: string; action: Action; name: string } | null>(null);
  const [reason, setReason] = useState('');
  const [query, setQuery] = useState('');

  async function act(id: string, action: Action, note?: string) {
    setPending((p) => ({ ...p, [id]: action }));
    setErrors((e) => { const n = { ...e }; delete n[id]; return n; });
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/mentors/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, 'Content-Type': 'application/json' },
        body: COMMENT_ACTIONS[action] ? JSON.stringify({ reason: note ?? '' }) : undefined,
      });
      if (res.ok) {
        setCommentFor(null);
        setConfirmFor(null);
        if (removeOnAction) {
          setMentors((ms) => ms.filter((m) => m.id !== id));
        } else {
          const updated = await res.json();
          setMentors((ms) => ms.map((m) => m.id === id ? { ...m, status: updated.status } : m));
        }
        // Re-fetch server data so the stats cards + other tabs reflect the change
        // immediately (no manual page refresh needed).
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        setErrors((e) => ({ ...e, [id]: body.detail || `Failed to ${action}. Please try again.` }));
      }
    } catch {
      setErrors((e) => ({ ...e, [id]: `Failed to ${action}. Please try again.` }));
    } finally {
      setPending((p) => { const n = { ...p }; delete n[id]; return n; });
    }
  }

  async function toggleDetail(id: string) {
    if (expanded[id]) {
      setExpanded((e) => ({ ...e, [id]: false }));
      return;
    }
    setExpanded((e) => ({ ...e, [id]: true }));
    if (details[id] !== undefined) return;
    setDetailLoading((l) => ({ ...l, [id]: true }));
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/mentors/${id}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
        cache: 'no-store',
      });
      const data = res.ok ? await res.json() : null;
      setDetails((d) => ({ ...d, [id]: data }));
    } catch {
      setDetails((d) => ({ ...d, [id]: null }));
    } finally {
      setDetailLoading((l) => ({ ...l, [id]: false }));
    }
  }

  const t = UI_CONTENT.admin;

  if (mentors.length === 0) {
    return <p className="text-sm text-muted">{t.empty}</p>;
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? mentors.filter((m) => `${m.display_name} ${m.headline ?? ''}`.toLowerCase().includes(q))
    : mentors;

  return (
    <div className="flex flex-col gap-4">
      {mentors.length > 3 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name or headline…"
          className="h-10 px-3 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none w-full sm:max-w-xs"
        />
      )}
      {visible.length === 0 && <p className="text-sm text-muted">No mentors match your search.</p>}
      {visible.map((mentor) => {
        const detail = details[mentor.id];
        const isExpanded = expanded[mentor.id];
        const isDetailLoading = detailLoading[mentor.id];

        return (
          <Card key={mentor.id}>
            <CardBody className="pt-6">
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <Avatar url={mentor.photo_url} name={mentor.display_name} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-semibold text-foreground">{mentor.display_name}</h2>
                      <Badge tone="neutral">{mentor.status.replace('_', ' ')}</Badge>
                      {mentor.submission_count > 1 && (
                        <Badge tone="warning">Re-submission #{mentor.submission_count}</Badge>
                      )}
                      {mentor.commission_pct != null &&
                        (!mentor.commission_expires_at || new Date(mentor.commission_expires_at) > new Date()) && (
                        <Badge tone="accent">Commission {mentor.commission_pct}%</Badge>
                      )}
                    </div>
                    {mentor.headline && (
                      <p className="text-sm text-muted mt-0.5">{mentor.headline}</p>
                    )}
                    <p className="text-xs text-muted mt-1">
                      {mentor.email ?? '-'}
                      {mentor.full_name ? ` · ${mentor.full_name}` : ''}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      Applied {new Date(mentor.created_at).toLocaleDateString()}
                    </p>
                    {errors[mentor.id] && (
                      <p className="text-xs text-red-600 mt-1">{errors[mentor.id]}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={() => toggleDetail(mentor.id)}
                    className="inline-flex items-center h-8 px-3 rounded-lg border border-[--color-border] text-xs font-medium text-muted hover:text-foreground hover:border-brand-300 transition-colors"
                  >
                    {isExpanded ? 'Hide details' : 'View details'}
                  </button>
                  {/* Confirm actions (suspend) live at the bottom of the details, not here. */}
                  {actions.filter(({ action }) => !CONFIRM_ACTIONS[action]).map(({ action, label, variant, loadingKey }) => (
                    <Button
                      key={action}
                      variant={variant}
                      size="sm"
                      loading={pending[mentor.id] === loadingKey}
                      disabled={!!pending[mentor.id]}
                      onClick={() => COMMENT_ACTIONS[action]
                        ? (setCommentFor({ id: mentor.id, action }), setReason(''))
                        : act(mentor.id, action)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Per-mentor commission override - on the card itself for active mentors */}
              {mentor.status === 'approved' && (
                <div className="mt-4 pt-4 border-t border-[--color-border]">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Commission</p>
                  <CommissionEditor mentorId={mentor.id} initialPct={mentor.commission_pct} initialExpiry={mentor.commission_expires_at} />
                </div>
              )}

              {/* Reviewer note (decline / request changes) - stored + shown to the mentor + emailed */}
              {commentFor?.id === mentor.id && COMMENT_ACTIONS[commentFor.action] && (
                <div className="mt-4 flex flex-col gap-2 rounded-xl border border-[--color-border] bg-brand-50/40 p-3">
                  <label className="text-xs font-medium text-foreground">
                    {COMMENT_ACTIONS[commentFor.action].title}{' '}
                    <span className="text-muted font-normal">({COMMENT_ACTIONS[commentFor.action].hint})</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder={COMMENT_ACTIONS[commentFor.action].placeholder}
                    className="px-3 py-2 rounded-lg bg-white text-sm text-foreground resize-none shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm"
                      loading={pending[mentor.id] === commentFor.action}
                      disabled={commentFor.action === 'request-changes' && !reason.trim()}
                      onClick={() => act(mentor.id, commentFor.action, reason)}>
                      {COMMENT_ACTIONS[commentFor.action].confirm}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setCommentFor(null)}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Detail panel */}
              {isExpanded && (
                <div className="mt-5 pt-5 border-t border-[--color-border]">
                  {isDetailLoading && <p className="text-sm text-muted">Loading profile…</p>}
                  {!isDetailLoading && !detail && (
                    <p className="text-sm text-red-600">Could not load profile details.</p>
                  )}
                  {!isDetailLoading && detail && <MentorDetailView detail={detail} />}
                  {/* Suspend (and any other confirm-action) sits at the very bottom of the details. */}
                  {actions.some(({ action }) => CONFIRM_ACTIONS[action]) && (
                    <div className="mt-6 pt-4 border-t border-[--color-border] flex flex-wrap justify-end gap-2">
                      {actions.filter(({ action }) => CONFIRM_ACTIONS[action]).map(({ action }) => (
                        <Button key={action} variant="outline" size="sm"
                          disabled={!!pending[mentor.id]}
                          onClick={() => setConfirmFor({ id: mentor.id, action, name: mentor.display_name })}>
                          {CONFIRM_ACTIONS[action].label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}

      {/* Confirmation popup for suspend (and any other confirm-action) */}
      {confirmFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog" aria-modal="true" onClick={() => setConfirmFor(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-foreground">
              {CONFIRM_ACTIONS[confirmFor.action].label}?
            </h3>
            <p className="text-sm text-muted">{CONFIRM_ACTIONS[confirmFor.action].body(confirmFor.name)}</p>
            {errors[confirmFor.id] && <p className="text-xs text-red-600">{errors[confirmFor.id]}</p>}
            <div className="flex justify-end gap-2 mt-1">
              <Button variant="ghost" size="sm" onClick={() => setConfirmFor(null)}>Cancel</Button>
              <Button variant="primary" size="sm"
                loading={pending[confirmFor.id] === confirmFor.action}
                onClick={() => act(confirmFor.id, confirmFor.action)}>
                {CONFIRM_ACTIONS[confirmFor.action].confirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MentorDetailView({ detail }: { detail: MentorDetail }) {
  const location = [detail.city, detail.country ? (COUNTRY_MAP[detail.country] ?? detail.country) : null]
    .filter(Boolean).join(', ');
  const rules = detail.availability_rules;
  const weekly = detail.weekly_availability ?? [];
  const overrides = detail.date_overrides ?? [];
  const services = detail.services ?? [];
  const socials = detail.social_links ?? [];

  return (
    <div className="flex flex-col gap-6 text-sm">
      {/* Profile details */}
      <section>
        <SectionLabel>Profile</SectionLabel>
        {detail.bio && (
          <Field label="Bio" full>
            <RichText html={detail.bio} className="text-foreground" />
          </Field>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mt-4">
          {location && <Field label="Location">{location}</Field>}
          {detail.home_country_code && (
            <Field label="Home country">{COUNTRY_MAP[detail.home_country_code] ?? detail.home_country_code}</Field>
          )}
          {detail.phone && <Field label="Phone">{detail.phone}</Field>}
          {detail.timezone && <Field label="Timezone">{detail.timezone}</Field>}
          {detail.years_professional_experience != null && (
            <Field label="Years of professional experience">
              {detail.years_professional_experience} yr{detail.years_professional_experience !== 1 ? 's' : ''}
            </Field>
          )}
          {detail.years_lived_experience != null && (
            <Field label="Years lived abroad">
              {detail.years_lived_experience} yr{detail.years_lived_experience !== 1 ? 's' : ''}
            </Field>
          )}
          {detail.expertise_country_codes?.length ? (
            <Field label="Countries of expertise">
              {detail.expertise_country_codes.map((c) => COUNTRY_MAP[c] ?? c).join(', ')}
            </Field>
          ) : null}
          {detail.languages?.length ? (
            <Field label="Languages">{detail.languages.map((l) => LANGUAGE_MAP[l] ?? l).join(', ')}</Field>
          ) : null}
          {detail.professional_domains?.length ? (
            <Field label="Professional domains">{detail.professional_domains.join(', ')}</Field>
          ) : null}
          {detail.expertise_categories?.length ? (
            <Field label="Expertise categories">{detail.expertise_categories.join(', ')}</Field>
          ) : null}
          {detail.session_duration_minutes != null && (
            <Field label="Default session length">{detail.session_duration_minutes} min</Field>
          )}
          {detail.avg_rating != null && (detail.review_count ?? 0) > 0 ? (
            <Field label="Rating">
              {detail.avg_rating.toFixed(1)} ({detail.review_count} review{detail.review_count !== 1 ? 's' : ''})
            </Field>
          ) : null}
          {detail.booking_url && (
            <Field label="External booking link">
              <a href={detail.booking_url} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline break-all">
                {detail.booking_url}
              </a>
            </Field>
          )}
        </div>
        {socials.length > 0 && (
          <Field label="Social links" full className="mt-4">
            <div className="flex flex-col gap-1">
              {socials.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="text-brand-700 hover:underline break-all">
                  <span className="text-muted">{SOCIAL_LABELS[s.type] ?? s.type}:</span> {s.url}
                </a>
              ))}
            </div>
          </Field>
        )}
        {detail.public_notes && (
          <Field label="Public notes" full className="mt-4">
            <p className="whitespace-pre-line text-foreground">{detail.public_notes}</p>
          </Field>
        )}
      </section>

      {/* Payout bank details */}
      <section>
        <SectionLabel>Payout details</SectionLabel>
        <BankSection mentorId={detail.id} bank={detail.bank} />
      </section>


      {/* Session types + the mentor's own price (what they set; customers pay this plus the
          platform markup and any PPP adjustment, which the mentor never sees). */}
      {/* BUG-146: the base rate every session price below is derived from. Placed directly above the
          sessions so the relationship is visible: the admin can see a price and see where it came
          from, instead of only the result. */}
      <section>
        <SectionLabel>Base rate &amp; currencies</SectionLabel>
        {detail.hourly_rate == null ? (
          <p className="text-muted text-xs">No base rate set.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-foreground font-semibold">
                {money(detail.hourly_rate, detail.currency)} / hour
              </span>
              {detail.smart_pricing
                ? <Badge tone="accent">fair pricing on</Badge>
                : <Badge tone="neutral">fair pricing off</Badge>}
            </div>
            {detail.currency_rates && detail.currency_rates.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-muted">Also priced in:</span>
                {detail.currency_rates.map((r) => (
                  <span key={r.currency} className="text-foreground">
                    {money(r.hourly_rate, r.currency)} / hour
                  </span>
                ))}
              </div>
            )}
            <p className="text-muted text-xs mt-1">
              Session prices are worked out from this rate by session length. Currencies not listed
              here are converted automatically.
            </p>
          </div>
        )}
      </section>

      <section>
        <SectionLabel>Session types &amp; pricing</SectionLabel>
        {services.length === 0 ? (
          <p className="text-muted text-xs">None added.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {services.map((s) => (
              <div key={s.id} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-foreground font-medium">{s.title}</span>
                  <span className="text-muted">· {s.duration} min</span>
                  <span className="text-foreground font-semibold">· {money(s.set_price, s.set_currency)}</span>
                  {s.is_ppp && <Badge tone="accent">fair pricing</Badge>}
                  {!s.is_active && <Badge tone="neutral">inactive</Badge>}
                  {s.status && s.status !== 'approved' && <Badge tone="warning">{s.status}</Badge>}
                </div>
                {/* FEAT-018: what the session actually offers. Approving a mentor on title and price
                    alone means approving copy nobody has read. */}
                {s.description && (
                  <p className="text-muted text-xs leading-relaxed whitespace-pre-line">
                    {richTextToPlain(s.description)}
                  </p>
                )}
              </div>
            ))}
            <p className="text-muted text-xs mt-1">Prices are the mentor&apos;s own rate. Customers are shown this plus the platform markup and any PPP adjustment.</p>
          </div>
        )}
      </section>

      {/* Weekly hours */}
      <section>
        <SectionLabel>Weekly hours</SectionLabel>
        {weekly.length === 0 ? (
          <p className="text-muted text-xs">Not set yet.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {weekly.map((s) => (
              <p key={s.id} className="text-foreground text-xs">
                <span className="inline-block w-24 font-medium">{s.weekday}</span>
                {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
              </p>
            ))}
            {weekly[0]?.timezone && <p className="text-muted text-xs mt-1">Timezone: {weekly[0].timezone}</p>}
          </div>
        )}
      </section>

      {/* Booking rules */}
      {rules && (rules.days_ahead != null || rules.min_notice_hours != null) && (
        <section>
          <SectionLabel>Booking rules</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-3">
            {rules.days_ahead != null && <Field label="Booking window">{rules.days_ahead} days ahead</Field>}
            {rules.min_notice_hours != null && <Field label="Minimum notice">{rules.min_notice_hours} hr</Field>}
            {rules.cancel_hours != null && <Field label="Cancellation notice">{rules.cancel_hours} hr</Field>}
          </div>
        </section>
      )}

      {/* Policies the mentor set at registration */}
      {(detail.app_buffertime || detail.app_cancellation_policy || detail.app_reschedule_policy) && (
        <section>
          <SectionLabel>Policies</SectionLabel>
          {detail.app_buffertime && (
            <Field label="Buffer between sessions">{fmtInterval(detail.app_buffertime)}</Field>
          )}
          {detail.app_cancellation_policy && (
            <Field label="Cancellation policy" full className="mt-4">
              <p className="whitespace-pre-line text-foreground">{detail.app_cancellation_policy}</p>
            </Field>
          )}
          {detail.app_reschedule_policy && (
            <Field label="Reschedule policy" full className="mt-4">
              <p className="whitespace-pre-line text-foreground">{detail.app_reschedule_policy}</p>
            </Field>
          )}
        </section>
      )}

      {/* Date overrides */}
      {overrides.length > 0 && (
        <section>
          <SectionLabel>Date overrides</SectionLabel>
          <div className="flex flex-col gap-1">
            {overrides.map((o) => (
              <p key={o.id} className="text-foreground text-xs">
                <span className="inline-block w-32 font-medium">{fmtDate(o.slot_date)}</span>
                {o.is_blackout
                  ? <span className="text-red-600">Blocked</span>
                  : <span>{fmtTime(o.start_time)} – {fmtTime(o.end_time)}</span>}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Set or clear a mentor's commission override (wins over the global commission until an optional
// expiry). The customer price the mentor's clients see uses this % instead of the global one.
function CommissionEditor({ mentorId, initialPct, initialExpiry }: { mentorId: string; initialPct?: number | null; initialExpiry?: string | null }) {
  const [pct, setPct] = useState(initialPct != null ? String(initialPct) : '');
  const [expiry, setExpiry] = useState(initialExpiry ? initialExpiry.slice(0, 10) : '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [current, setCurrent] = useState<{ pct: number | null; expiry: string | null }>({ pct: initialPct ?? null, expiry: initialExpiry ?? null });

  async function save(clear: boolean) {
    setSaving(true); setMsg(null);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const commission_pct = clear ? null : (pct.trim() === '' ? null : parseFloat(pct));
      const expires_at = clear || !expiry ? null : new Date(expiry + 'T23:59:59').toISOString();
      const res = await fetch(`/api/admin/mentors/${mentorId}/commission`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_pct, expires_at }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setMsg(d.detail || 'Could not save.'); return; }
      setCurrent({ pct: commission_pct, expiry: expires_at });
      if (clear) { setPct(''); setExpiry(''); }
      setMsg('Saved.');
    } catch { setMsg('Could not reach the server.'); }
    finally { setSaving(false); }
  }

  const expired = current.expiry ? new Date(current.expiry) < new Date() : false;
  const active = current.pct != null && !expired;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted">
        {active
          ? <>Override active: <span className="font-semibold text-foreground">{current.pct}%</span>{current.expiry ? ` until ${current.expiry.slice(0, 10)}` : ' (no expiry)'}.</>
          : current.pct != null
            ? <>Override <span className="font-semibold text-foreground">expired</span> - using the global commission.</>
            : 'No override - this mentor uses the global commission.'}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Commission %</span>
          <input type="number" min={0} max={100} step={0.5} value={pct} onChange={(e) => setPct(e.target.value)} placeholder="e.g. 12"
            className="h-9 w-24 px-2 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Expires (optional)</span>
          <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)}
            className="h-9 px-2 rounded-lg bg-white text-sm shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none" />
        </label>
        <Button variant="primary" size="sm" loading={saving} disabled={pct.trim() === ''} onClick={() => save(false)}>Set</Button>
        {current.pct != null && <Button variant="ghost" size="sm" onClick={() => save(true)}>Clear</Button>}
      </div>
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </div>
  );
}

// Masked payout details with an explicit reveal (the founder decrypts full numbers to pay).
function BankSection({ mentorId, bank }: { mentorId: string; bank?: MaskedBank | null }) {
  const [revealed, setRevealed] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bank?.has_details) return <p className="text-muted text-xs">No bank details on file.</p>;

  async function reveal() {
    setLoading(true); setError(null);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const res = await fetch(`/api/admin/mentors/${mentorId}/bank/reveal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.detail || 'Could not reveal details.'); return; }
      setRevealed(data.details ?? {});
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
      <Field label="Account holder">{bank.account_holder_name || 'Not set'}</Field>
      {bank.bank_name && <Field label="Bank">{bank.bank_name}</Field>}
      <Field label="Country">{bank.country_code ? (COUNTRY_MAP[bank.country_code] ?? bank.country_code) : 'Not set'}</Field>
      <Field label="Account">{revealed ? '' : (bank.account_masked || '••••')}</Field>
      <div className="sm:col-span-2">
        {revealed ? (
          <div className="rounded-lg border border-[--color-border] p-3 flex flex-col gap-1 text-xs">
            {Object.entries(revealed).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <span className="text-muted">{BANK_FIELD_LABELS[k] ?? k}</span>
                <span className="font-medium text-foreground break-all text-right">{String(v)}</span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <Button variant="outline" onClick={reveal} loading={loading}>Reveal full details</Button>
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

const BANK_FIELD_LABELS: Record<string, string> = {
  account_number: 'Account number', iban: 'IBAN', routing_number: 'Routing number (ABA)',
  account_type: 'Account type', sort_code: 'Sort code', ifsc: 'IFSC', swift_bic: 'SWIFT/BIC',
  bank_address: 'Bank address',
};

function Avatar({ url, name }: { url?: string | null; name: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="h-12 w-12 shrink-0 rounded-full object-cover border border-[--color-border]" />;
  }
  return (
    <div className="h-12 w-12 shrink-0 rounded-full bg-brand-50 border border-[--color-border] flex items-center justify-center text-brand-300">
      <User className="h-6 w-6" />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">{children}</p>;
}

function Field({ label, children, full, className }: { label: string; children: React.ReactNode; full?: boolean; className?: string }) {
  return (
    <div className={`${full ? 'sm:col-span-2' : ''} ${className ?? ''}`}>
      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">{label}</p>
      <div className="text-foreground">{children}</div>
    </div>
  );
}
