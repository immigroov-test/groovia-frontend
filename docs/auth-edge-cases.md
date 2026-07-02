# Auth / login edge cases

Our flow: popup email → `POST /api/auth/check-email` (looks up `profiles.email`, sends
no email) → existing ⇒ `signInWithOtp({shouldCreateUser:false})`; new ⇒ collect name ⇒
`signInWithOtp({shouldCreateUser:true, data:{full_name}})`. Google is a separate OAuth
button. Callback (`/auth/callback`) exchanges the link, calls backend `/auth/sync` (mentor
auto-link), then redirects. Every auth user gets a `profiles` row via the
`handle_new_user` trigger (copies `full_name`, `role` from metadata).

Legend: ✅ handled · ⚠️ works, has a caveat/config · 🔧 candidate fix

## Identity — same email, different method
| # | Scenario | What happens | Status |
|---|----------|--------------|--------|
| 1 | Signed up with **Google**, later enters the **same email** in the magic-link box | `check-email` finds the profile → treats as existing → sends a magic link → clicking it logs into the **same** account (email is unique in `auth.users`). No duplicate. | ✅ |
| 2 | Signed up with **magic link**, later clicks **Continue with Google** (same email) | Governed by Supabase's identity-linking. If "link identities for the same verified email" is on → one account. If off → can throw "email already registered". | ⚠️ enable linking in Supabase |
| 3 | Different email on Google vs typed email | Two separate accounts (by design — different identities). | ✅ |

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
| 22 | Email enumeration via `check-email` | Reveals whether an address is registered — inherent to the "skip name for existing" UX; standard tradeoff. | ⚠️ accepted |
