// Visitor geolocation via free, no-key, CORS-enabled IP providers, with a
// timezone fallback. Drives the PPP/currency country for pricing and the home-page
// location badge. A successful lookup is cached in localStorage so the providers
// are hit at most once per browser; the timezone fallback is NOT cached, so a
// transient provider outage doesn't permanently pin a possibly-wrong country.

export interface GeoLocation {
  code: string;    // ISO-3166 alpha-2, uppercase
  city?: string;   // when the provider supplies it
}

const CACHE_KEY = 'ig_geo_location';

// Timezone -> country: the offline fallback when every provider fails.
const TZ_COUNTRY: Record<string, string> = {
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Europe/Amsterdam': 'NL', 'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE', 'America/Sao_Paulo': 'BR', 'America/New_York': 'US', 'America/Los_Angeles': 'US',
  'Europe/London': 'GB', 'Asia/Dubai': 'AE', 'Australia/Sydney': 'AU', 'Asia/Singapore': 'SG',
  'Asia/Tokyo': 'JP', 'Africa/Johannesburg': 'ZA', 'America/Toronto': 'CA', 'Asia/Manila': 'PH',
  'Asia/Shanghai': 'CN', 'Asia/Dhaka': 'BD', 'Asia/Karachi': 'PK', 'Asia/Jakarta': 'ID',
};

function tzCountry(): string {
  try { return TZ_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone] || 'US'; }
  catch { return 'US'; }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

// Client-side IP-geolocation providers, tried in order (the browser-location backup to Vercel's
// edge geo). Each resolves to { code, city } or throws; the caller moves to the next on failure.
const PROVIDERS: (() => Promise<GeoLocation>)[] = [
  async () => {
    // country.is: tiny, fast, very reliable - country only.
    const r = await (await withTimeout(fetch('https://api.country.is/'), 2500)).json();
    return { code: String(r.country || '').toUpperCase() };
  },
  async () => {
    const r = await (await withTimeout(fetch('https://get.geojs.io/v1/ip/geo.json'), 2500)).json();
    return { code: String(r.country_code || '').toUpperCase(), city: r.city || undefined };
  },
  async () => {
    const r = await (await withTimeout(fetch('https://ipwho.is/'), 2500)).json();
    return { code: String(r.country_code || '').toUpperCase(), city: r.city || undefined };
  },
  async () => {
    const r = await (await withTimeout(fetch('https://ipapi.co/json/'), 2500)).json();
    return { code: String(r.country_code || '').toUpperCase(), city: r.city || undefined };
  },
];

function readCache(): GeoLocation | null {
  try { const raw = localStorage.getItem(CACHE_KEY); return raw ? (JSON.parse(raw) as GeoLocation) : null; }
  catch { return null; }
}
function writeCache(g: GeoLocation) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(g)); } catch { /* ignore */ }
}

let inflight: Promise<GeoLocation> | null = null;

// The visitor's detected location (country + city when available). Cached across
// calls and page loads. De-duped so concurrent callers share one lookup.
//
// Source order: (1) our /api/geo, which returns Vercel's edge geo - the SAME value
// the backend uses for pricing, so the badge/currency shown always match what's
// charged; (2) client IP providers, for local dev or when the edge header is
// absent; (3) timezone. Only real detections are cached.
export function detectLocation(): Promise<GeoLocation> {
  if (typeof window === 'undefined') return Promise.resolve({ code: 'US' });
  const cached = readCache();
  if (cached && /^[A-Z]{2}$/.test(cached.code)) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const r = await (await withTimeout(fetch('/api/geo', { cache: 'no-store' }), 2500)).json();
      const code = String(r.country || '').toUpperCase();
      if (/^[A-Z]{2}$/.test(code)) { const g = { code, city: r.city || undefined }; writeCache(g); return g; }
    } catch { /* fall through to client-side providers */ }
    for (const p of PROVIDERS) {
      try {
        const g = await p();
        if (/^[A-Z]{2}$/.test(g.code)) { writeCache(g); return g; }
      } catch { /* try the next provider */ }
    }
    return { code: tzCountry() };   // not cached: retry providers on the next visit
  })().finally(() => { inflight = null; });
  return inflight;
}

// Just the 2-letter country code, for the pricing quote/convert calls.
export async function detectCountry(): Promise<string | undefined> {
  const g = await detectLocation();
  return /^[A-Z]{2}$/.test(g.code) ? g.code : undefined;
}

// Country to price for on the display side, honouring a ?country=XX override so you can preview
// prices as any country on staging (detection uses your real location, e.g. Tilburg -> NL -> EUR).
// Display-only: in production the backend trusts the signed edge geo and ignores this, so the
// override never changes what a real visitor is charged.
export async function pricingCountry(): Promise<string | undefined> {
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search).get('country');
    if (q && /^[A-Za-z]{2}$/.test(q)) return q.toUpperCase();
  }
  return detectCountry();
}

// "IN" -> "India" using the platform's own locale data (no map to maintain).
export function countryName(code: string): string {
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) || code.toUpperCase(); }
  catch { return code.toUpperCase(); }
}
