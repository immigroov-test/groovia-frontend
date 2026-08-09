// Mentor multi-currency pricing helpers (shared by onboarding + hub + profile edit).
// Model: one PRIMARY currency + base hourly rate, plus optional additional-currency rates.
// Each service's per-currency prices are derived from these rates by duration.

export interface CurrencyRate {
  currency: string;
  hourly_rate: number;
}

// Currencies the backend FX engine supports: most are live-quoted (Frankfurter/ECB,
// _FX_BASE_SYMBOLS in db/pricing.py); a few (AED, SAR, ...) Frankfurter doesn't publish and are
// kept fresh as stable manual EUR-pivot rates instead (_MANUAL_FX in db/pricing.py) - both are
// fully priceable, this list just isn't a 1:1 subset of either one.
export const CURRENCIES: { code: string; symbol: string; name: string; country: string }[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', country: 'IN' },
  { code: 'USD', symbol: '$', name: 'US Dollar', country: 'US' },
  { code: 'EUR', symbol: '€', name: 'Euro', country: 'EU' },
  { code: 'GBP', symbol: '£', name: 'British Pound', country: 'GB' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', country: 'CA' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', country: 'AU' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', country: 'NZ' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', country: 'SG' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', country: 'CH' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', country: 'JP' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', country: 'HK' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', country: 'SE' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', country: 'NO' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', country: 'DK' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', country: 'AE' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', country: 'SA' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', country: 'ZA' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', country: 'BR' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', country: 'MY' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', country: 'PH' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', country: 'TH' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', country: 'ID' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', country: 'PL' },
];

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export function currencyName(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.name ?? code;
}

// ISO-2 country for a currency's flag (EUR -> EU). Falls back to the code so <Flag> just renders blank.
export function currencyCountry(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.country ?? code;
}

// BUG-062: the 5 most common additional-currency markets, offered as one-click shortcuts below
// the base rate so a mentor doesn't have to hunt through the full currency dropdown one row at a
// time. Each still lands as a normal, editable row in `rates` - same fixed-rate behavior as any
// currency added via "Add another currency".
export const TOP_CURRENCIES: { country: string; currency: string }[] = [
  { country: 'IN', currency: 'INR' },
  { country: 'AU', currency: 'AUD' },
  { country: 'SG', currency: 'SGD' },
  { country: 'SA', currency: 'SAR' },
  { country: 'US', currency: 'USD' },
];

// Price prorated from an hourly rate for a given duration (2dp).
export function proratePrice(hourlyRate: number | undefined, duration: number): number {
  if (!hourlyRate || hourlyRate <= 0) return 0;
  return Math.round(hourlyRate * (duration / 60) * 100) / 100;
}

// A service's explicit per-currency prices, derived from the mentor's additional-currency rates.
export function deriveCurrencyPrices(rates: CurrencyRate[], duration: number): { currency: string; base_price: number }[] {
  return rates
    .filter((r) => r.currency && r.hourly_rate > 0)
    .map((r) => ({ currency: r.currency, base_price: proratePrice(r.hourly_rate, duration) }));
}
