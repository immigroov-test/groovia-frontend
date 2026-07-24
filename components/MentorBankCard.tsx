'use client';
import { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';
import { BankDetailsFields } from './BankDetailsFields';
import { COUNTRIES } from '../lib/countries';
import { emptyBank, validateBank, toBankPayload, type BankValue } from '../lib/bank';

const COUNTRY_MAP = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.name]));

interface MaskedBank {
  has_details: boolean;
  country_code?: string;
  account_holder_name?: string;
  bank_name?: string | null;
  account_masked?: string;
}

async function authToken(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession();
  return session?.access_token ?? null;
}

// Self-contained payout-details card for the Mentor Hub "Payments" tab. Loads the mentor's masked
// details, lets them add/replace them. Full account numbers are never returned here (admin-only reveal).
export function MentorBankCard({ defaultCountry = '' }: { defaultCountry?: string }) {
  const [masked, setMasked] = useState<MaskedBank | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [bank, setBank] = useState<BankValue>(emptyBank(defaultCountry));
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await authToken();
        const res = await fetch('/api/mentor/bank', { headers: { Authorization: `Bearer ${token ?? ''}` }, cache: 'no-store' });
        const data = res.ok ? await res.json() : { has_details: false };
        setMasked(data);
        if (!data?.has_details) setEditing(true);
      } catch {
        setMasked({ has_details: false });
        setEditing(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    const errs = validateBank(bank);
    setErrors(errs);
    if (errs.length) return;
    setSaving(true); setSaveError(null); setSaved(false);
    try {
      const token = await authToken();
      const res = await fetch('/api/mentor/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify(toBankPayload(bank) ?? {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setSaveError(data.detail || 'Could not save your bank details. Please try again.'); return; }
      setMasked(data);
      setEditing(false);
      setSaved(true);
      setBank(emptyBank(defaultCountry));
    } catch {
      setSaveError('Could not reach the server. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Card><CardBody className="pt-6 text-sm text-muted">Loading payout details…</CardBody></Card>;
  }

  return (
    <Card>
      <CardBody className="pt-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Payout details</h2>
          <p className="text-sm text-muted mt-0.5">
            Where Immigroov sends your earnings for completed sessions. Your account number is
            encrypted and never shown in full.
          </p>
        </div>

        {masked?.has_details && !editing && (
          <div className="rounded-xl border border-[--color-border] p-4 flex flex-col gap-1.5 text-sm">
            <Row k="Account holder" v={masked.account_holder_name || 'Not set'} />
            {masked.bank_name && <Row k="Bank" v={masked.bank_name} />}
            <Row k="Country" v={masked.country_code ? (COUNTRY_MAP[masked.country_code] ?? masked.country_code) : 'Not set'} />
            <Row k="Account" v={masked.account_masked || '••••'} />
            <div className="pt-2">
              <Button variant="outline" onClick={() => { setEditing(true); setSaved(false); }}>Update details</Button>
            </div>
          </div>
        )}

        {saved && !editing && <p className="text-sm text-green-700">Saved. Your payout details are up to date.</p>}

        {editing && (
          <div className="flex flex-col gap-4">
            {masked?.has_details && <p className="text-xs text-muted">Saving replaces your current details.</p>}
            <BankDetailsFields value={bank} onChange={setBank} />
            {errors.length > 0 && (
              <ul className="text-sm text-red-600 list-disc pl-5">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            <div className="flex gap-2">
              <Button variant="accent" onClick={save} loading={saving}>Save payout details</Button>
              {masked?.has_details && (
                <Button variant="ghost" onClick={() => { setEditing(false); setErrors([]); setSaveError(null); }}>Cancel</Button>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted shrink-0">{k}</span>
      <span className="font-medium text-foreground text-right">{v}</span>
    </div>
  );
}
