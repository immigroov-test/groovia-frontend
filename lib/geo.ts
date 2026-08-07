// Visitor geolocation, fully automatic (no manual country choice, so pricing can't be gamed).
// Order of sources, each the real location, never user-claimed:
//   1. /api/geo   Vercel edge geo from the real connection IP (the SAME value the backend
//                 prices on). Fetched fresh on every load, so a move is reflected at once.
//   2. cache      a recent successful detection (short TTL), only to avoid re-hitting the
//                 external providers while the edge geo is momentarily unavailable.
//   3. providers  client-side IP-geolocation APIs (still the real IP).
//   4. browser    if IP detection fails entirely, ask the visitor for device location access
//                 (navigator.geolocation) and reverse-geocode it to a country.
//   5. timezone   last-resort guess from the browser timezone.

export interface GeoLocation {
  code: string;    // ISO-3166 alpha-2, uppercase
  city?: string;   // when the source supplies it
}

interface CacheEntry extends GeoLocation { ts: number; source: 'auto' | 'provider' | 'geo'; }

const CACHE_KEY = 'ig_geo_location';
// Short, so a stale value can never pin the wrong country for long (the original bug was an
// infinite cache). The edge geo is authoritative and fetched fresh anyway; this only covers the
// window where it is briefly unavailable.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;   // 6 hours

// Timezone -> country: the offline fallback when everything else fails.
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

// Device location via the browser's Geolocation API (this triggers the "allow location access"
// prompt). Only used when IP detection has failed. The coordinates are reverse-geocoded to a
// country with a free, no-key, CORS-enabled service. Rejects if unavailable, denied, or timed out.
function browserGeo(): Promise<GeoLocation> {
  return new Promise<GeoLocation>((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { reject(new Error('no geolocation')); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
          const j = await (await withTimeout(fetch(url), 2500)).json();
          const code = String(j.countryCode || '').toUpperCase();
          if (isCode(code)) resolve({ code, city: j.city || j.locality || undefined });
          else reject(new Error('reverse geocode failed'));
        } catch (e) { reject(e as Error); }
      },
      (err) => reject(err),
      { timeout: 8000, maximumAge: 10 * 60 * 1000, enableHighAccuracy: false },
    );
  });
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const e = JSON.parse(raw) as CacheEntry;
    return e && isCode(e.code) && typeof e.ts === 'number' ? e : null;
  } catch { return null; }
}
function writeCache(g: GeoLocation, source: CacheEntry['source']) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...g, ts: Date.now(), source })); } catch { /* ignore */ }
}
function isFresh(e: CacheEntry | null, ttl: number): boolean {
  return !!e && (Date.now() - e.ts) < ttl;
}

let inflight: Promise<GeoLocation> | null = null;

// The visitor's detected location (country + city when available). De-duped so concurrent callers
// share one lookup, which also means the geolocation prompt (step 4) can fire at most once.
export function detectLocation(): Promise<GeoLocation> {
  if (typeof window === 'undefined') return Promise.resolve({ code: 'US' });
  if (inflight) return inflight;
  inflight = (async () => {
    // 1. Authoritative: Vercel edge geo from the real connection IP, fresh every load.
    try {
      const r = await (await withTimeout(fetch('/api/geo', { cache: 'no-store' }), 2500)).json();
      const code = String(r.country || '').toUpperCase();
      if (isCode(code)) { const g: GeoLocation = { code, city: r.city || undefined }; writeCache(g, 'auto'); return g; }
    } catch { /* edge geo unavailable (local dev / missing header) - fall through */ }

    // 2. Recent successful detection, only while the edge geo is momentarily unavailable.
    const cached = readCache();
    if (isFresh(cached, CACHE_TTL_MS)) return { code: cached!.code, city: cached!.city };

    // 3. Client IP providers (real IP), silent (no prompt).
    for (const p of PROVIDERS) {
      try { const g = await p(); if (isCode(g.code)) { writeCache(g, 'provider'); return g; } } catch { /* next */ }
    }

    // 4. IP detection failed: ask the visitor for device location access, then reverse-geocode it.
    try { const g = await browserGeo(); writeCache(g, 'geo'); return g; } catch { /* denied / unavailable */ }

    // 5. Last resort: a stale prior detection, else the timezone. Not cached, so we retry next visit.
    if (cached) return { code: cached.code, city: cached.city };
    return { code: tzCountry() };
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
// edge geo and ignores this, so it never changes what a real visitor is charged.
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
