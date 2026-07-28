'use client';
import { useState } from 'react';
import { Input } from './ui/Input';
import { CountrySelect } from './ui/CountrySelect';
import { schemeForCountry, bankFieldErrors, type BankValue } from '../lib/bank';

// Country-driven payout fields, shared by mentor onboarding + profile edit. Controlled: the parent
// owns the BankValue and validates it with validateBank() from lib/bank. Each field is also checked
// inline (on blur) against its country's rules. Sensitive numbers are encrypted at rest by the backend.
export function BankDetailsFields({
  value, onChange,
}: {
  value: BankValue;
  onChange: (v: BankValue) => void;
}) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const set = (patch: Partial<BankValue>) => onChange({ ...value, ...patch });
  const blur = (field: keyof BankValue) => setTouched((t) => ({ ...t, [field]: true }));
  const scheme = value.country_code ? schemeForCountry(value.country_code) : null;
  const fieldErrs = bankFieldErrors(value);
  const err = (field: keyof BankValue) => (touched[field] ? fieldErrs[field] : undefined);

  return (
    <div className="flex flex-col gap-4">
      <CountrySelect
        label="Bank account country"
        value={value.country_code}
        onChange={(c) => set({ country_code: c })}
        required
        placeholder="Where is your bank account held?"
        hint="This decides which bank details we ask for."
      />

      {scheme && (
        <>
          <Input
            label="Account holder name"
            value={value.account_holder_name}
            onChange={(e) => set({ account_holder_name: e.target.value })}
            onBlur={() => blur('account_holder_name')}
            error={err('account_holder_name')}
            placeholder="Exactly as it appears on the account"
            autoComplete="off"
          />

          {scheme === 'iban' && (
            <>
              <Input label="IBAN" value={value.iban} onChange={(e) => set({ iban: e.target.value.toUpperCase() })}
                onBlur={() => blur('iban')} error={err('iban')}
                placeholder="e.g. DE89 3704 0044 0532 0130 00" autoComplete="off" spellCheck={false} />
              <Input label="SWIFT / BIC (optional)" value={value.swift_bic} onChange={(e) => set({ swift_bic: e.target.value.toUpperCase() })}
                onBlur={() => blur('swift_bic')} error={err('swift_bic')}
                placeholder="e.g. DEUTDEFF" autoComplete="off" spellCheck={false}
                hint="Helps for international transfers." />
              <Input label="Bank name (optional)" value={value.bank_name} onChange={(e) => set({ bank_name: e.target.value })}
                placeholder="e.g. Deutsche Bank" autoComplete="off" />
            </>
          )}

          {scheme === 'india' && (
            <>
              <Input label="Bank name" value={value.bank_name} onChange={(e) => set({ bank_name: e.target.value })}
                onBlur={() => blur('bank_name')} error={err('bank_name')}
                placeholder="e.g. HDFC Bank" autoComplete="off" />
              <Input label="Account number" value={value.account_number} onChange={(e) => set({ account_number: e.target.value })}
                onBlur={() => blur('account_number')} error={err('account_number')}
                placeholder="Your bank account number" inputMode="numeric" autoComplete="off" />
              <Input label="IFSC code" value={value.ifsc} onChange={(e) => set({ ifsc: e.target.value.toUpperCase() })}
                onBlur={() => blur('ifsc')} error={err('ifsc')}
                placeholder="e.g. HDFC0001234" autoComplete="off" spellCheck={false}
                hint="11 characters, found on your cheque book or bank app." />
            </>
          )}

          {scheme === 'us' && (
            <>
              <Input label="Account number" value={value.account_number} onChange={(e) => set({ account_number: e.target.value })}
                onBlur={() => blur('account_number')} error={err('account_number')}
                placeholder="Your account number" inputMode="numeric" autoComplete="off" />
              <Input label="Routing number (ABA)" value={value.routing_number} onChange={(e) => set({ routing_number: e.target.value })}
                onBlur={() => blur('routing_number')} error={err('routing_number')}
                placeholder="9 digits" inputMode="numeric" autoComplete="off" />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Account type</label>
                <select
                  value={value.account_type}
                  onChange={(e) => set({ account_type: e.target.value })}
                  onBlur={() => blur('account_type')}
                  className="h-11 px-3.5 rounded-xl bg-white text-sm text-foreground shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] focus:outline-none focus:shadow-[0_0_0_2px_rgba(29,78,216,0.25)]"
                >
                  <option value="">Select account type</option>
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
                {err('account_type') && <p className="text-xs text-red-600">{err('account_type')}</p>}
              </div>
              <Input label="Bank name (optional)" value={value.bank_name} onChange={(e) => set({ bank_name: e.target.value })}
                placeholder="e.g. Chase" autoComplete="off" />
            </>
          )}

          {scheme === 'uk' && (
            <>
              <Input label="Account number" value={value.account_number} onChange={(e) => set({ account_number: e.target.value })}
                onBlur={() => blur('account_number')} error={err('account_number')}
                placeholder="8 digits" inputMode="numeric" autoComplete="off" />
              <Input label="Sort code" value={value.sort_code} onChange={(e) => set({ sort_code: e.target.value })}
                onBlur={() => blur('sort_code')} error={err('sort_code')}
                placeholder="e.g. 12-34-56" inputMode="numeric" autoComplete="off" />
              <Input label="Bank name (optional)" value={value.bank_name} onChange={(e) => set({ bank_name: e.target.value })}
                placeholder="e.g. Barclays" autoComplete="off" />
            </>
          )}

          {scheme === 'swift' && (
            <>
              <Input label="Bank name" value={value.bank_name} onChange={(e) => set({ bank_name: e.target.value })}
                onBlur={() => blur('bank_name')} error={err('bank_name')}
                placeholder="Your bank's name" autoComplete="off" />
              <Input label="Account number / IBAN" value={value.account_number} onChange={(e) => set({ account_number: e.target.value })}
                onBlur={() => blur('account_number')} error={err('account_number')}
                placeholder="Your account number" autoComplete="off" spellCheck={false} />
              <Input label="SWIFT / BIC" value={value.swift_bic} onChange={(e) => set({ swift_bic: e.target.value.toUpperCase() })}
                onBlur={() => blur('swift_bic')} error={err('swift_bic')}
                placeholder="e.g. DBSSSGSG" autoComplete="off" spellCheck={false}
                hint="8 or 11 characters, used for international transfers." />
              <Input label="Bank address (optional)" value={value.bank_address} onChange={(e) => set({ bank_address: e.target.value })}
                placeholder="Branch address, if known" autoComplete="off" />
            </>
          )}

          <p className="text-xs text-muted leading-relaxed">
            Your account number is encrypted and never shown in full.
          </p>
        </>
      )}
    </div>
  );
}
