// Shared field validators. Mirrors backend/routers/mentor.py's _validate_city so the
// client can reject bad input before a round-trip (BUG-004).
const CITY_ALLOWED_RE = /^[A-Za-zÀ-ɏḀ-ỿ\s'.,-]+$/;
const CITY_HAS_LETTER_RE = /[A-Za-zÀ-ɏḀ-ỿ]/;

export function validateCityName(v: string): string | null {
  const trimmed = v.trim();
  if (!trimmed) return null; // optional field
  if (trimmed.length > 100) return 'City must be 100 characters or fewer.';
  if (!CITY_ALLOWED_RE.test(trimmed) || !CITY_HAS_LETTER_RE.test(trimmed)) {
    return 'City must contain only letters, spaces, hyphens, apostrophes, periods, and commas.';
  }
  return null;
}
