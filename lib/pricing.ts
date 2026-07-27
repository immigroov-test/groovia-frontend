// Mentor multi-currency pricing helpers (shared by onboarding + hub + profile edit).
// Model: one PRIMARY currency + base hourly rate, plus optional additional-currency rates.
// Each service's per-currency prices are derived from these rates by duration.

export interface CurrencyRate {
  currency: string;
  hourly_rate: number;
}

// Currencies the backend FX engine supports (must stay a subset of _FX_BASE_SYMBOLS in db/pricing.py).
export const CURRENCIES: { code: string; symbol: string; name: string }[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
];

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

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
