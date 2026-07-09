'use client';
import { useState } from 'react';
import { User } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';
import { RichText } from './ui/RichText';
import { COUNTRIES } from '../lib/countries';
import { LANGUAGES } from '../lib/languages';

const COUNTRY_MAP = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.name]));
const LANGUAGE_MAP = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.name]));

interface SocialLink { type: string; url: string }

interface ProposedChanges {
  display_name?: string;
  headline?: string | null;
  photo_url?: string | null;
  phone?: string | null;
  bio?: string | null;
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
  languages?: string[];
  social_links?: SocialLink[];
  public_notes?: string | null;
  expertise_country_codes?: string[];
  professional_domains?: string[];
  years_lived_experience?: number | null;
}

export interface AdminRevision {
  id: string;
  display_name: string;
  headline: string | null;
  photo_url: string | null;
  email: string | null;
  full_name: string | null;
  pending_submitted_at: string | null;
  pending_changes: ProposedChanges | null;
}

const FIELD_LABELS: Record<keyof ProposedChanges, string> = {
  display_name: 'Full name', headline: 'Headline', photo_url: 'Photo', phone: 'Phone',
  bio: 'Bio', country: 'Country', city: 'City', timezone: 'Timezone', languages: 'Languages',
  social_links: 'Social links', public_notes: 'Public notes',
  expertise_country_codes: 'Countries of expertise', professional_domains: 'Professional domains',
  years_lived_experience: 'Years lived abroad',
};

export function AdminRevisionList({ initialRevisions }: { initialRevisions: AdminRevision[] }) {
  const [revisions, setRevisions] = useState(initialRevisions);
  const [pending, setPending] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  async function act(id: string, action: 'approve' | 'request-changes', note?: string) {
    setPending((p) => ({ ...p, [id]: action }));
    setErrors((e) => { const n = { ...e }; delete n[id]; return n; });
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/mentors/${id}/revision/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, 'Content-Type': 'application/json' },
        body: action === 'request-changes' ? JSON.stringify({ reason: note ?? '' }) : undefined,
      });
      if (res.ok) {
        setCommentFor(null);
        setRevisions((rs) => rs.filter((r) => r.id !== id));
      } else {
        const body = await res.json().catch(() => ({}));
        setErrors((e) => ({ ...e, [id]: body.detail || 'Action failed. Please try again.' }));
      }
    } catch {
      setErrors((e) => ({ ...e, [id]: 'Action failed. Please try again.' }));
    } finally {
      setPending((p) => { const n = { ...p }; delete n[id]; return n; });
    }
  }

  if (revisions.length === 0) {
    return <p className="text-sm text-muted">No profile updates awaiting review.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {revisions.map((rev) => {
        const changes = rev.pending_changes ?? {};
        const keys = (Object.keys(changes) as (keyof ProposedChanges)[]).filter((k) => FIELD_LABELS[k]);
        return (
          <Card key={rev.id}>
            <CardBody className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  {rev.photo_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={rev.photo_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover border border-[--color-border]" />
                    : <div className="h-12 w-12 shrink-0 rounded-full bg-brand-50 border border-[--color-border] flex items-center justify-center text-brand-300"><User className="h-6 w-6" /></div>}
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground">{rev.display_name}</h3>
                    <p className="text-xs text-muted mt-0.5">{rev.email ?? '-'}</p>
                    {rev.pending_submitted_at && (
                      <p className="text-xs text-muted mt-0.5">Submitted {new Date(rev.pending_submitted_at).toLocaleString()}</p>
                    )}
                    {errors[rev.id] && <p className="text-xs text-red-600 mt-1">{errors[rev.id]}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Button variant="outline" size="sm" loading={pending[rev.id] === 'request-changes'} disabled={!!pending[rev.id]}
                    onClick={() => { setCommentFor(rev.id); setReason(''); }}>
                    Request changes
                  </Button>
                  <Button variant="accent" size="sm" loading={pending[rev.id] === 'approve'} disabled={!!pending[rev.id]}
                    onClick={() => act(rev.id, 'approve')}>
                    Approve changes
                  </Button>
                </div>
              </div>

              {commentFor === rev.id && (
                <div className="mt-4 flex flex-col gap-2 rounded-xl border border-[--color-border] bg-brand-50/40 p-3">
                  <label className="text-xs font-medium text-foreground">
                    What should the mentor change? <span className="text-muted font-normal">(shown in their dashboard; live profile stays up)</span>
                  </label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500}
                    placeholder="e.g. The new headline is too vague; please keep it specific to your expertise."
                    className="px-3 py-2 rounded-lg bg-white text-sm text-foreground resize-none shadow-[0_0_0_1px_rgba(15,23,42,0.1)] focus:outline-none" />
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" loading={pending[rev.id] === 'request-changes'} disabled={!reason.trim()}
                      onClick={() => act(rev.id, 'request-changes', reason)}>Send request</Button>
                    <Button variant="ghost" size="sm" onClick={() => setCommentFor(null)}>Cancel</Button>
                  </div>
                </div>
              )}

              <div className="mt-5 pt-5 border-t border-[--color-border]">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">Proposed changes</p>
                {keys.length === 0 ? (
                  <p className="text-sm text-muted">No field details.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    {keys.map((k) => (
                      <div key={k} className={k === 'bio' || k === 'public_notes' || k === 'social_links' ? 'sm:col-span-2' : ''}>
                        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">{FIELD_LABELS[k]}</p>
                        <FieldValue field={k} value={changes[k]} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

function FieldValue({ field, value }: { field: keyof ProposedChanges; value: unknown }) {
  if (value == null || value === '') return <p className="text-muted">(cleared)</p>;
  if (field === 'bio') return <RichText html={value as string} className="text-foreground" />;
  if (field === 'photo_url') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={value as string} alt="" className="h-16 w-16 rounded-full object-cover border border-[--color-border]" />;
  }
  if (field === 'social_links') {
    const links = value as SocialLink[];
    if (!links.length) return <p className="text-muted">(none)</p>;
    return (
      <div className="flex flex-col gap-1">
        {links.map((s, i) => (
          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline break-all">
            <span className="text-muted">{s.type}:</span> {s.url}
          </a>
        ))}
      </div>
    );
  }
  if (field === 'languages') return <p className="text-foreground">{(value as string[]).map((l) => LANGUAGE_MAP[l] ?? l).join(', ')}</p>;
  if (field === 'expertise_country_codes') return <p className="text-foreground">{(value as string[]).map((c) => COUNTRY_MAP[c] ?? c).join(', ')}</p>;
  if (field === 'country') return <p className="text-foreground">{COUNTRY_MAP[value as string] ?? (value as string)}</p>;
  if (field === 'professional_domains') return <p className="text-foreground">{(value as string[]).join(', ')}</p>;
  return <p className="text-foreground whitespace-pre-line">{String(value)}</p>;
}
