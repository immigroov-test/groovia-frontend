# Groovia — Frontend (`groovia-frontend`)

User-facing web app for **Immigroov**, a two-sided immigration mentorship marketplace.
It's the UI for **Groovia** — an AI agent that guides candidates through country
discovery and matches them to mentors they can book paid sessions with.

This repo is **Next.js 16 (App Router) on Vercel**. It renders every page server-side
(for SEO) and talks to the API/agent in the **separate** [`groovia-backend`](https://github.com/immigroov-test/groovia-backend)
repo. The browser never calls the backend directly — all calls go through Next.js API
routes (BFF proxy), so `BACKEND_URL` and tokens stay server-side.

> Two repos, one product: **`groovia-frontend`** (this) = Next.js UI on Vercel.
> **`groovia-backend`** = FastAPI + LangGraph API/agent on Render + Supabase.

---

## Current status (what works today)

| Area | Status |
|---|---|
| Auth — Supabase email/password + Google OAuth, in-app modal, SPA navigation | ✅ Working |
| Groovia chat (guest + logged-in, history) | ✅ Working |
| Mentor flow — register → onboarding → set services & availability | ✅ Working |
| Admin — review queue, approve / reject mentors | ✅ Working |
| Mentor browse + in-app booking + lifecycle management UI | ✅ Working |
| Responsive (mobile + desktop), deployed on Vercel `staging` | ✅ Working |

## Future developments (planned per PRD v2.1 — not yet built)

Payment checkout (Stripe / Razorpay) & credits · reviews & ratings · candidate
dashboard & roadmap · CV optimizer UI · Sponsor Radar · group sessions / webinars ·
cookie consent banner & GDPR self-service · analytics (GA4 / PostHog / GTM) · MFA.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |
| Auth | Supabase SSR (`@supabase/ssr`) |
| Markdown | react-markdown + remark-gfm |
| Icons | lucide-react |

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values (see below)
npm run dev                  # http://localhost:3000
```

## Key env vars

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (public) |
| `BACKEND_URL` | Yes | FastAPI backend base URL — **server-side only, no `NEXT_PUBLIC_` prefix** |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY` | No | reCAPTCHA v3 on signup; skipped if unset |
| `NEXT_PUBLIC_FEATURE_*` | No | Feature flags (see `lib/features.ts`) |

## Structure — what each file holds

```
groovia-frontend/           # ← this folder is the repo root
├── middleware.ts           # Session refresh + auth redirects (runs on matched routes)
├── app/
│   ├── (shell)/            # Pages inside the persistent left-nav shell
│   │   ├── page.tsx        #   landing (middleware redirects "/" → "/chat")
│   │   ├── chat/           #   Groovia chat
│   │   ├── mentors/        #   public browse + [slug] profile/booking
│   │   ├── mentor/         #   mentor hub, onboarding, register, profile, availability
│   │   ├── admin/          #   admin approval dashboard
│   │   └── account/        #   candidate account + bookings
│   ├── (auth)/             # login / signup / forgot / reset / verify (open the auth modal)
│   ├── auth/callback/      # OAuth + email-confirmation callback
│   └── api/                # BFF proxy routes → forward to BACKEND_URL with the user's token
├── components/
│   ├── AuthModal.tsx       # Login / signup / forgot — SPA nav, existing-email + cross-tab handling
│   ├── GoogleButton.tsx    # Supabase Google OAuth trigger
│   ├── MentorRegisterForm.tsx / MentorOnboardingForm.tsx  # mentor signup + profile
│   ├── ChatInterface.tsx   # Stateful chat (upload, intent, markdown)
│   ├── DirectBookingWidget.tsx   # 3-step booking (service → slot → confirm), guest-capable
│   ├── ServicesManager.tsx / AvailabilityManagerV2.tsx   # mentor hub panels
│   ├── BookingManager.tsx  # cancel / reschedule / no-show for both parties
│   └── AdminMentorList.tsx # admin approve/reject queue
└── lib/
    ├── backend.ts          # backendBaseUrl() — reads BACKEND_URL (server-side)
    ├── supabase/           # client / server / middleware Supabase factories
    ├── features.ts         # NEXT_PUBLIC_FEATURE_* flags
    └── recaptcha.ts        # reCAPTCHA v3 loader (no-op without a site key)
```

## Architecture notes

- **BFF proxy:** all backend calls route through `app/api/**` — the client never sees `BACKEND_URL`.
- **Auth is a modal**, not a page: `/login` and `/signup` redirect into `/chat?auth=open`,
  and navigation after login uses `router.push` + `router.refresh` so the left nav stays
  mounted (no full-page reload).
- **Mentor profile** (`/mentors/[slug]`): shows `DirectBookingWidget` when the mentor has
  active services, else a plain profile.

## Deployment (Vercel)

Import this repo, set **Root Directory = `./`** (it's a standalone repo), pick the
production branch (`staging` for the staging project), and set the env vars above. The
`app/api/**` proxy routes run as Vercel functions. `NEXT_PUBLIC_*` values are inlined at
build time — change one and you must redeploy.
