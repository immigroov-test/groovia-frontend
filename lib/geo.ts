// Visitor geolocation. The PRIMARY source in production is Vercel's edge geo (the real
// connection IP), fetched fresh on every load via /api/geo, so the location follows the
// visitor when they move countries. IP providers and the timezone are fallbacks used only
// when the edge geo is unavailable (local dev, or a missing header). A manual user override
// wins over detection (with a TTL, so it self-heals if the visitor later moves), as the
// backup for when detection is wrong or blocked.
//
// Note: this drives the DISPLAY location + currency. The amount actually charged always
// follows the trusted edge IP on the backend, so a manual override never lets someone spoof
// a cheaper country at checkout.

export interface GeoLocation {
  code: string;    // ISO-3166 alpha-2, uppercase
  city?: string;   // when the source supplies it
}

interface CacheEntry extends GeoLocation { ts: number; source: 'auto' | 'provider' | 'user'; }

const CACHE_KEY = 'ig_geo_location';
const OVERRIDE_KEY = 'ig_geo_override';
// The fallback cache is only used when the authoritative edge geo is unavailable; keep it
// short so a stale value can never pin the wrong country for long (the original bug).
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;      // 6 hours
const OVERRIDE_TTL_MS = 24 * 60 * 60 * 1000;  // a manual choice self-heals after a day

// Timezone -> country: the offline fallback when every provider fails.
const TZ_COUNTRY: Record<string, string> = {
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Europe/Amsterdam': 'NL', 'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE', 'America/Sao_Paulo': 'BR', 'America/New_York': 'US', 'America/Los_Angeles': 'US',
  'Europe/London': 'GB', 'Asia/Dubai': 'AE', 'Australia/Sydney': 'AU', 'Asia/Singapore': 'SG',
  'Asia/Tokyo': 'JP', 'Africa/Johannesburg': 'ZA', 'America/Toronto': 'CA', 'Asia/Manila': 'PH',
  'Asia/Shanghai': 'CN', 'Asia/Dhaka': 'BD', 'Asia/Karachi': 'PK', 'Asia/Jakarta': 'ID',
};

function isCode(c: string): boolean {
  return /^[A-Z]{2}$/.test(c);
}

function tzCountry(): string {
  try { return TZ_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone] || 'US'; }
  catch { return 'US'; }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

// Client-side IP-geolocation providers, tried in order (the browser-side backup to Vercel's
// edge geo). Each resolves to { code, city } or throws; the caller moves to the next on failure.
const PROVIDERS: (() => Promise<GeoLocation>)[] = [
  async () => {
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

function readEntry(key: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const e = JSON.parse(raw) as CacheEntry;
    return e && isCode(e.code) && typeof e.ts === 'number' ? e : null;
  } catch { return null; }
}
function writeEntry(key: string, e: CacheEntry) {
  try { localStorage.setItem(key, JSON.stringify(e)); } catch { /* ignore */ }
}
function isFresh(e: CacheEntry | null, ttl: number): boolean {
  return !!e && (Date.now() - e.ts) < ttl;
}

// ── Manual override (the backup): the visitor tells us their country. It wins over
// detection until it expires, so it also covers detection being blocked or wrong (e.g. VPN).
export function setUserCountry(code: string, city?: string): void {
  const c = (code || '').toUpperCase();
  if (!isCode(c)) return;
  writeEntry(OVERRIDE_KEY, { code: c, city, ts: Date.now(), source: 'user' });
}
export function clearUserCountry(): void {
  try { localStorage.removeItem(OVERRIDE_KEY); } catch { /* ignore */ }
}
export function getUserCountry(): GeoLocation | null {
  const e = readEntry(OVERRIDE_KEY);
  return isFresh(e, OVERRIDE_TTL_MS) ? { code: e!.code, city: e!.city } : null;
}
export function hasUserCountry(): boolean {
  return getUserCountry() !== null;
}

let inflight: Promise<GeoLocation> | null = null;

// The visitor's detected location (country + city when available). De-duped so concurrent
// callers share one lookup.
//
// Order: (0) a manual user override, if set; (1) /api/geo (Vercel edge geo, the real IP and
// the SAME value the backend prices on) - fetched fresh so a move is reflected at once;
// (2) a recent fallback cache, only when the edge geo is unavailable; (3) client IP
// providers; (4) a stale prior detection, else the timezone.
export function detectLocation(): Promise<GeoLocation> {
  if (typeof window === 'undefined') return Promise.resolve({ code: 'US' });
  const override = getUserCountry();
  if (override) return Promise.resolve(override);
  if (inflight) return inflight;
  inflight = (async () => {
    // 1. Authoritative: Vercel edge geo from the real connection IP. Fresh every load in
    //    production, so changing country is reflected immediately (no infinite cache).
    try {
      const r = await (await withTimeout(fetch('/api/geo', { cache: 'no-store' }), 2500)).json();
      const code = String(r.country || '').toUpperCase();
      if (isCode(code)) {
        const g: GeoLocation = { code, city: r.city || undefined };
        writeEntry(CACHE_KEY, { ...g, ts: Date.now(), source: 'auto' });
        return g;
      }
    } catch { /* edge geo unavailable (local dev / missing header) - fall through */ }

    const cached = readEntry(CACHE_KEY);
    // 2. Recent fallback cache: avoids re-hitting external providers on every load while the
    //    edge geo is down. Short TTL so it can never pin the wrong country for long.
    if (isFresh(cached, CACHE_TTL_MS)) return { code: cached!.code, city: cached!.city };

    // 3. Client IP providers (real IP).
    for (const p of PROVIDERS) {
      try {
        const g = await p();
        if (isCode(g.code)) { writeEntry(CACHE_KEY, { ...g, ts: Date.now(), source: 'provider' }); return g; }
      } catch { /* try the next provider */ }
    }

    // 4. Last resort: a stale prior detection (better than nothing), else the timezone.
    if (cached) return { code: cached.code, city: cached.city };
    return { code: tzCountry() };   // not cached: retry on the next visit
  })().finally(() => { inflight = null; });
  return inflight;
}

// Just the 2-letter country code, for the pricing quote/convert calls.
export async function detectCountry(): Promise<string | undefined> {
  const g = await detectLocation();
  return isCode(g.code) ? g.code : undefined;
}

// Country to price for on the display side, honouring a ?country=XX override so you can preview
// prices as any country on staging. Display-only: in production the backend trusts the signed
// edge geo and ignores this, so the override never changes what a real visitor is charged.
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
