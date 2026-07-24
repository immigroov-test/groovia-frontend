// Country-aware payout bank details: scheme detection + client-side validation.
// This MIRRORS the backend (services/bank_validation.py) so mentors get instant feedback; the
// backend re-validates authoritatively on submit. Keep the two in sync when adding a scheme.

export type BankScheme = 'iban' | 'india' | 'us' | 'uk' | 'swift';

export interface BankValue {
  country_code: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  iban: string;
  routing_number: string;
  account_type: string;   // us: '' | 'checking' | 'savings'
  sort_code: string;      // uk
  ifsc: string;           // india
  swift_bic: string;      // iban (optional) / swift
  bank_address: string;   // swift (optional)
}

export function emptyBank(country = ''): BankValue {
  return {
    country_code: country, account_holder_name: '', bank_name: '', account_number: '', iban: '',
    routing_number: '', account_type: '', sort_code: '', ifsc: '', swift_bic: '', bank_address: '',
  };
}

// ISO 13616 IBAN length per country (presence => IBAN scheme).
const IBAN_LEN: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29, BY: 28, CH: 21,
  CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, EG: 29, ES: 24, FI: 18, FO: 18, FR: 27,
  GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28, HR: 21, HU: 28, IE: 22, IL: 23, IS: 26, IT: 27,
  JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24, ME: 22,
  MK: 19, MR: 27, MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24,
  RS: 22, SA: 24, SC: 31, SE: 24, SI: 19, SK: 24, SM: 27, TN: 24, TR: 26, UA: 29, VA: 22, VG: 24,
  XK: 20,
};

export function schemeForCountry(cc: string): BankScheme {
  const c = (cc || '').toUpperCase();
  if (c === 'IN') return 'india';
  if (c === 'US') return 'us';
  if (c === 'GB') return 'uk';          // domestic UK uses sort code, not IBAN
  if (IBAN_LEN[c]) return 'iban';
  return 'swift';
}

function mod97(numeric: string): number {
  let rem = 0;
  for (let i = 0; i < numeric.length; i++) rem = (rem * 10 + (numeric.charCodeAt(i) - 48)) % 97;
  return rem;
}

function ibanValid(v: string): boolean {
  const s = (v || '').replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(s)) return false;
  const expected = IBAN_LEN[s.slice(0, 2)];
  if (expected && s.length !== expected) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  const numeric = [...rearranged].map((ch) => (/[A-Z]/.test(ch) ? (ch.charCodeAt(0) - 55).toString() : ch)).join('');
  return mod97(numeric) === 1;
}

function routingValid(v: string): boolean {
  const s = (v || '').replace(/\D/g, '');
  if (s.length !== 9) return false;
  const d = [...s].map(Number);
  return (3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8])) % 10 === 0;
}

const ifscValid = (v: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test((v || '').replace(/\s+/g, '').toUpperCase());
const swiftValid = (v: string) => /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test((v || '').replace(/\s+/g, '').toUpperCase());
const sortValid = (v: string) => (v || '').replace(/\D/g, '').length === 6;

/** True when the mentor hasn't entered any bank data (so we can skip it at signup). */
export function bankIsEmpty(v: BankValue): boolean {
  return !(
    v.account_holder_name.trim() || v.account_number.trim() || v.iban.trim() ||
    v.routing_number.trim() || v.sort_code.trim() || v.ifsc.trim() || v.swift_bic.trim()
  );
}

/** Human-readable errors for the current scheme (empty array = OK). */
export function validateBank(v: BankValue): string[] {
  const e: string[] = [];
  const cc = (v.country_code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) { e.push("Select your bank account's country."); return e; }
  if (v.account_holder_name.trim().length < 2) e.push("Enter the account holder's full name.");
  const scheme = schemeForCountry(cc);
  const acct = (min: number, max: number) => {
    const s = v.account_number.replace(/[\s-]/g, '');
    if (!s) e.push('Enter the account number.');
    else if (s.length < min || s.length > max) e.push(`Account number must be ${min}-${max} characters.`);
  };
  if (scheme === 'iban') {
    if (!ibanValid(v.iban)) e.push('Enter a valid IBAN.');
    if (v.swift_bic.trim() && !swiftValid(v.swift_bic)) e.push('Enter a valid SWIFT/BIC code.');
  } else if (scheme === 'india') {
    if (!v.bank_name.trim()) e.push('Enter the bank name.');
    acct(6, 20);
    if (!ifscValid(v.ifsc)) e.push('Enter a valid IFSC code (e.g. HDFC0001234).');
  } else if (scheme === 'us') {
    acct(4, 17);
    if (!routingValid(v.routing_number)) e.push('Enter a valid 9-digit routing number.');
    if (v.account_type !== 'checking' && v.account_type !== 'savings') e.push('Choose an account type.');
  } else if (scheme === 'uk') {
    acct(6, 10);
    if (!sortValid(v.sort_code)) e.push('A UK sort code must be 6 digits.');
  } else {
    if (!v.bank_name.trim()) e.push('Enter the bank name.');
    acct(4, 34);
    if (!swiftValid(v.swift_bic)) e.push('Enter a valid SWIFT/BIC code (8 or 11 characters).');
  }
  return e;
}

/** Per-field errors for the current scheme, keyed by field name. Used for inline (on-blur)
 *  validation so each field is checked against its country's rules as the mentor fills it in. */
export function bankFieldErrors(v: BankValue): Partial<Record<keyof BankValue, string>> {
  const errs: Partial<Record<keyof BankValue, string>> = {};
  const cc = (v.country_code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return errs;   // no country picked yet -> nothing to validate
  const scheme = schemeForCountry(cc);
  if (v.account_holder_name.trim().length < 2) errs.account_holder_name = "Enter the account holder's full name.";
  const acctLen = (min: number, max: number): string | null => {
    const s = v.account_number.replace(/[\s-]/g, '');
    if (!s) return 'Enter the account number.';
    if (s.length < min || s.length > max) return `Account number must be ${min}-${max} characters.`;
    return null;
  };
  if (scheme === 'iban') {
    if (!v.iban.trim()) errs.iban = 'Enter your IBAN.';
    else if (!ibanValid(v.iban)) errs.iban = 'Enter a valid IBAN.';
    if (v.swift_bic.trim() && !swiftValid(v.swift_bic)) errs.swift_bic = 'Enter a valid SWIFT/BIC code.';
  } else if (scheme === 'india') {
    if (!v.bank_name.trim()) errs.bank_name = 'Enter the bank name.';
    const a = acctLen(6, 20); if (a) errs.account_number = a;
    if (!v.ifsc.trim()) errs.ifsc = 'Enter your IFSC code.';
    else if (!ifscValid(v.ifsc)) errs.ifsc = 'Enter a valid IFSC code (e.g. HDFC0001234).';
  } else if (scheme === 'us') {
    const a = acctLen(4, 17); if (a) errs.account_number = a;
    if (!v.routing_number.trim()) errs.routing_number = 'Enter the routing number.';
    else if (!routingValid(v.routing_number)) errs.routing_number = 'Enter a valid 9-digit routing number.';
    if (v.account_type !== 'checking' && v.account_type !== 'savings') errs.account_type = 'Choose an account type.';
  } else if (scheme === 'uk') {
    const a = acctLen(6, 10); if (a) errs.account_number = a;
    if (!v.sort_code.trim()) errs.sort_code = 'Enter the sort code.';
    else if (!sortValid(v.sort_code)) errs.sort_code = 'A UK sort code must be 6 digits.';
  } else {
    if (!v.bank_name.trim()) errs.bank_name = 'Enter the bank name.';
    const a = acctLen(4, 34); if (a) errs.account_number = a;
    if (!v.swift_bic.trim()) errs.swift_bic = 'Enter your SWIFT/BIC code.';
    else if (!swiftValid(v.swift_bic)) errs.swift_bic = 'Enter a valid SWIFT/BIC code (8 or 11 characters).';
  }
  return errs;
}

/** Payload for POST /mentor/bank (and the signup body's `bank`). Returns null when empty. */
export function toBankPayload(v: BankValue): Record<string, string> | null {
  if (bankIsEmpty(v)) return null;
  const scheme = schemeForCountry((v.country_code || '').toUpperCase());
  const out: Record<string, string> = {
    country_code: v.country_code.toUpperCase(),
    account_holder_name: v.account_holder_name.trim(),
  };
  if (v.bank_name.trim()) out.bank_name = v.bank_name.trim();
  if (scheme === 'iban') {
    out.iban = v.iban.replace(/\s+/g, '').toUpperCase();
    if (v.swift_bic.trim()) out.swift_bic = v.swift_bic.replace(/\s+/g, '').toUpperCase();
  } else if (scheme === 'india') {
    out.account_number = v.account_number.replace(/[\s-]/g, '');
    out.ifsc = v.ifsc.replace(/\s+/g, '').toUpperCase();
  } else if (scheme === 'us') {
    out.account_number = v.account_number.replace(/[\s-]/g, '');
    out.routing_number = v.routing_number.replace(/\D/g, '');
    out.account_type = v.account_type;
  } else if (scheme === 'uk') {
    out.account_number = v.account_number.replace(/[\s-]/g, '');
    out.sort_code = v.sort_code.replace(/\D/g, '');
  } else {
    out.account_number = v.account_number.replace(/[\s-]/g, '');
    out.swift_bic = v.swift_bic.replace(/\s+/g, '').toUpperCase();
    if (v.bank_address.trim()) out.bank_address = v.bank_address.trim();
  }
  return out;
}
