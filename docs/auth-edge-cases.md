# Auth / login edge cases

**Current model (2026-07-03): email + PASSWORD, with 6-digit CODE verification for new
users.** Popup email → `POST /api/auth/check-email` → **existing ⇒ password login**
(`signInWithPassword`, + forgot-password) · **new ⇒ send code** (`signInWithOtp`) →
`verifyOtp(code)` → **set name + password** (`updateUser`). Google is a separate OAuth
button. `handle_new_user` trigger copies `full_name`/`role` into `profiles`.

Legend: ✅ handled · ⚠️ works, has a caveat/config · 🔧 candidate fix

## Current-model edge cases (email + password + code)
| # | Scenario | Handling | Status |
|---|----------|----------|--------|
| C1 | **Account with no password** (Google-only, or verified the code then abandoned before setting a password) → email routes to Login → password fails | `signInWithPassword` errors; the message now guides to **Forgot password** (works for any existing user → sets a password), or use the Google button | ✅ recover via forgot-pwd; 🔧 nicer: `check-email` returns `has_password` to route them to setup |
| C2 | **Abandoned setup** after verifying the code | They're already signed in (session) with no password/name; password only matters for a future fresh login (forgot-pwd recovers). Name can be set in Account | ⚠️ low |
| C3 | **Email enumeration** via `check-email` | Reveals if an email is registered - inherent to routing existing→login / new→signup | ⚠️ accepted (rate-limit to harden) |
| C4 | **Verification-email abuse** (entering many emails to spam codes) | Mitigated by Supabase per-email + hourly OTP rate limits | 🔧 add our own rate-limit on check-email/send |
| C5 | **OTP brute force** - 6-digit code | 1M combos, ~1h expiry, Supabase throttles verify attempts | ✅ low risk |
| C6 | **verifyOtp signs the user in mid-flow** → could close the popup before they set a password | `settingUp` ref suppresses the auto-close until `updateUser` completes | ✅ handled |
| C7 | **Open redirect** via `?next` | `safeNext` allows same-origin paths only | ✅ fixed |
| C8 | **Password reset** link | Routed through `/auth/callback?next=/reset-password` → session → `updateUser`; link is one-time + unguessable | ✅ |
| C9 | **Password strength** | Min 8 chars client-side + Supabase policy | 🔧 optionally require upper/number in Supabase Auth |
| C10 | **Supabase email template still shows the magic link** | If present, clicking it logs in but skips setup | 🔧 set template to show only `{{ .Token }}` (the code) |

## Guest-mode booking edge cases (current state - full guest flow not built yet)
| # | Scenario | Handling | Status |
|---|----------|----------|--------|
| G1 | Guests currently book with an **unverified email** (booking form takes email, no code yet) | Code verification + `role=guest` is the next build; until then a stranger's email could be used | 🔧 guest integration |
| G2 | **Guest can't reschedule/cancel** | Reschedule endpoints require `candidate_id == user.id`; guest bookings have NULL `candidate_id` | 🔧 guest verified account (candidate_id set) fixes it |
| G3 | **`role='guest'` not in the enum** | `user_role` is `candidate|mentor|admin` - needs `guest` added | 🔧 DB change in guest integration |
| G4 | **Guest re-login** - a guest account has no password | Can't log in by password later; recovers by verifying a code again, or forgot-password (which upgrades them to a full account) | ⚠️ design note |

---

## (Historical) magic-link model edge cases
The table below documents the previous passwordless magic-link model, kept for reference.

## Identity - same email, different method
| # | Scenario | What happens | Status |
|---|----------|--------------|--------|
| 1 | Signed up with **Google**, later enters the **same email** in the magic-link box | `check-email` finds the profile → treats as existing → sends a magic link → clicking it logs into the **same** account (email is unique in `auth.users`). No duplicate. | ✅ |
| 2 | Signed up with **magic link**, later clicks **Continue with Google** (same email) | Governed by Supabase's identity-linking. If "link identities for the same verified email" is on → one account. If off → can throw "email already registered". | ⚠️ enable linking in Supabase |
| 3 | Different email on Google vs typed email | Two separate accounts (by design - different identities). | ✅ |

## New vs existing detection
| # | Scenario | What happens | Status |
|---|----------|--------------|--------|
| 4 | Brand-new email | not-exists → name step → account created, name → `profiles.full_name`. | ✅ |
| 5 | Existing but **unconfirmed** (created via OTP, never clicked) | profile already exists → existing → resends link. Name captured on first attempt. | ✅ |
| 6 | `check-email` backend **down** | Falls back to the name step; `signInWithOtp` still logs an existing user in (name just isn't overwritten). | ✅ graceful |
| 7 | Name re-typed on a 2nd attempt for an unconfirmed account | Trigger is `ON CONFLICT DO NOTHING`, so the profile name isn't updated. | ⚠️ minor |

## Mentor auto-link (`/auth/sync`)
| # | Scenario | What happens | Status |
|---|----------|--------------|--------|
| 8 | Admin pre-approves a mentor **by email**, they log in first time | Account created → linked to the mentor row + role granted. | ✅ |
| 9 | Existing **candidate** later promoted to mentor (row added by admin) | Linked on **next login** (current session needs a re-login to see mentor UI). | ⚠️ re-login needed |
| 10 | Email matches **multiple** mentor rows | Links the first row with a null profile. | ⚠️ shouldn't occur |
| 11 | Mentor row already linked to a **different** profile | Skipped (only null-profile rows link) → no mentor access. | ✅ safe |

## Magic-link delivery & clicking
| # | Scenario | What happens | Status |
|---|----------|--------------|--------|
| 12 | Link opened in a **different browser/device** | PKCE exchange fails → redirect to `/login?error=callback_failed`. (Chosen: same-browser only.) | ⚠️ needs a clear error screen |
| 13 | Link **expired** (>1h) or **already used** (one-time) | Same failure path as #12. | ⚠️ same |
| 14 | Too many requests in a short window | Supabase 429. Single-send reduces it; built-in sender caps ~a few/hour. | 🔧 custom SMTP |
| 15 | Clicks link while logged in as someone else | Session switches to the link's user. | ✅ |

## Redirect / session / tabs
| # | Scenario | What happens | Status |
|---|----------|--------------|--------|
| 16 | Malicious `?next=//evil.com` | Sanitized to same-origin paths → defaults to `/chat`. | ✅ fixed |
| 17 | Login completes in **another tab** | Open popup auto-closes + page refreshes. | ✅ |
| 18 | **Logout** in one tab | Other tabs stay "logged in" until refresh. | 🔧 optional cross-tab logout |

## Data / account state
| # | Scenario | What happens | Status |
|---|----------|--------------|--------|
| 19 | Very long / odd characters in name | Stored as-is (no max length on the field). | 🔧 add maxLength/trim |
| 20 | Email case / whitespace | Normalized to lowercase + trimmed everywhere. | ✅ |
| 21 | **Soft-deleted** profile (`deleted_at` set) logs in again | `check-email` doesn't filter `deleted_at` → says "exists"; behaviour depends on whether `auth.users` was also removed. | 🔧 filter deleted_at |
| 22 | Email enumeration via `check-email` | Reveals whether an address is registered - inherent to the "skip name for existing" UX; standard tradeoff. | ⚠️ accepted |
