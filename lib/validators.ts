// Shared field validators. Mirrors backend/routers/mentor.py's _validate_city so the
// client can reject bad input before a round-trip (BUG-004).
import { parsePhoneNumberFromString } from 'libphonenumber-js';
const CITY_ALLOWED_RE = /^[A-Za-zÀ-ɏḀ-ỿ\s'.,-]+$/;
const CITY_HAS_LETTER_RE = /[A-Za-zÀ-ɏḀ-ỿ]/;

/** The phone rule for both mentor forms (BUG-068).
 *
 * Lives here because the two forms had drifted: onboarding checked validity, the profile editor
 * checked nothing at all, so the error PhoneInput draws was decoration in one and absent in the
 * other and a bad number saved either way.
 *
 * Checks the number against ITS OWN dial code, never against the mentor's country. Deliberately: a
 * mentor living in the Netherlands keeping their Indian number is normal, and for a platform whose
 * users are migrants it is close to the default case. Tying the two would reject correct data.
 *
 * Digit counts come from libphonenumber's metadata rather than a table of our own: India 10,
 * Netherlands 9, and every country with variable-length ranges handled properly. Note it accepts
 * some shorter numbers a flat "9 digits" reading would reject, because those ranges are real.
 */
export function validatePhone(phone: string): string | null {
  const trimmed = (phone || '').trim();
  if (!trimmed) return null;                       // optional; blank is not an error
  const parsed = parsePhoneNumberFromString(trimmed);
  if (!parsed || !parsed.isValid()) {
    return 'Enter a valid phone number for the selected country code.';
  }
  return null;
}

export function validateCityName(v: string): string | null {
  const trimmed = v.trim();
  if (!trimmed) return null; // optional field
  if (trimmed.length > 100) return 'City must be 100 characters or fewer.';
  if (!CITY_ALLOWED_RE.test(trimmed) || !CITY_HAS_LETTER_RE.test(trimmed)) {
    return 'City must contain only letters, spaces, hyphens, apostrophes, periods, and commas.';
  }
  return null;
}
