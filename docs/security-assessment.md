# Security assessment — Immigroov

Scope: how user/mentor private data is protected, the AI resume path, and the checks to run.
Legend: ✅ in place · ⚠️ in place but audit/harden · 🔧 to do.

## 1. Does the frontend touch the DB directly?
**No unrestricted access.** Three paths:

| Path | Key used | Guard |
|---|---|---|
| **Auth** (login/signup/reset) | Supabase **anon** key (public, by design) | Supabase Auth |
| **`profiles` — own row only** (role, account, editor) | anon key | **RLS** `USING (auth.uid() = id)` |
| **Everything else** (bookings, mentors, services, admin, chat) | — | **FastAPI backend** (service-role) via BFF `app/api/**` |

- ✅ The **service-role key is backend-only** — verified no `NEXT_PUBLIC_` leak, so the browser can never bypass RLS.
- ✅ **RLS is enabled** (19 tables, 20 policies). The anon key can only read what a policy allows.
- ✅ The only direct table the frontend reads is `profiles`, restricted to the caller's own row by RLS.
- ➡️ So: **auth + own-profile go straight to Supabase (RLS-protected); all privileged data goes through the backend.**

## 2. Access control / authorization
- ⚠️ **Audit the RLS policies themselves** — enabled ≠ correct. Test with a raw anon key that user A cannot read user B's `profiles`/`bookings`. This is the #1 protection for the direct-access path.
- ✅ Backend (service-role **bypasses RLS by design**) enforces authz in code: `require_admin`; cancel/reschedule check `is_candidate`/`is_mentor`.
- ⚠️ **IDOR sweep** — confirm every `/booking/*`, `/mentor/*`, `/admin/*` that takes an id checks ownership before acting (spot-checked cancel/reschedule; verify the rest).
- ✅ JWT verified locally (`core/auth.py`, HS256 + JWKS).

## 3. PII / private data (users + mentors)
- ✅ At rest: Supabase encrypts. In transit: HTTPS (Vercel + Render).
- ⚠️ **PII in logs** — don't log emails / resume text / tokens in plaintext. The mailer logs recipient addresses (review for prod).
- 🔧 **GDPR** (EU immigration audience): data **export + right-to-deletion**, DPAs with sub-processors (Supabase, Groq, Resend), cookie consent. Deferred — build before launch.
- ⚠️ **Email enumeration** via `check-email` (reveals if an address is registered) — accepted UX tradeoff; rate-limit to harden.
- ⚠️ Guest bookings store an email (PII) with no account — ensure only the backend exposes them.

## 4. AI / resume scanning (highest-attention area)
The **full resume text is sent to a third-party LLM (Groq)** for analysis; only a **summary is persisted** (`profiles.summary` via `save_profile_summary_if_empty`) — good data-minimization.
- 🔧 **Consent + disclosure**: the Privacy Policy must state that resumes are processed by AI and name sub-processors (Groq). The new signup consent box points at it — the policy text needs this added.
- 🔧 **LLM data retention**: confirm Groq does **not** retain/train on the data (use a no-retention setting/tier); get it in writing.
- ⚠️ **Prompt injection**: resume content is attacker-controlled and could carry "ignore previous instructions…". Treat it as *data, not instructions*; the reviewer node + output validation help. Add explicit guarding in the system prompt.
- ⚠️ **Special-category data**: resumes carry nationality/age/etc. → bias + GDPR special data. Minimize what's extracted/stored.
- ✅ Don't persist the full resume (only the summary) — keep it that way.
- 🔧 **File parsing safety**: validate upload type/size; PDF/DOCX parsers have had CVEs — keep libs patched, cap size.

## 5. Injection / input validation
- ✅ **No raw SQL** — parameterized RPCs + Supabase client; admin search sanitizes `q`.
- ✅ Pydantic validates every request body.
- ✅ **XSS**: React escapes; email templates escape user input (`_e()`).
- ✅ **Double-booking**: DB-level GiST `EXCLUDE` constraint; **idempotency key** on booking.

## 6. Secrets, rate-limiting, transport
- 🔧 **Rotate the exposed GitHub PAT** (it's embedded in the git remote URL).
- ✅ No secrets committed; `.env` gitignored; sensitive keys are backend-env only.
- 🔧 **Rate-limit** the **AI/chat** (LLM cost + DoS), **booking**, and **check-email** endpoints (`slowapi` exists — extend it).
- 🔧 Restrict **CORS** to the frontend origin; add security headers (CSP, `X-Frame-Options`, `nosniff`) in `next.config`.
- 🔧 **Webhook HMAC** verification for any Cal/Nylas/Stripe inbound.
- 🔧 `npm audit` + `pip audit` for CVEs.

## Top 5 to do first
1. **Audit RLS policies** (prove anon can't read others' rows).
2. **Rotate the exposed PAT.**
3. **Disclose AI/resume + sub-processors in the Privacy Policy**; confirm Groq no-retention.
4. **Rate-limit** AI/chat + booking + check-email.
5. **IDOR sweep** of all id-taking endpoints; never log PII.
