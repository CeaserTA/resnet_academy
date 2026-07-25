# Resnet LMS — Production Readiness Assessment

**Prepared:** 2026-07-25 · **Method:** full read of `.agents/context/project-tracker.md` (182 lines,
~160 tracked work items across 7 phases) cross-checked against the actual codebase (`composer.json`,
`.env.example`, `bootstrap/app.php`, `config/sanctum.php`, `config/logging.php`, `routes/console.php`,
`routes/api.php`, `frontend/package.json`, `frontend/src/main.tsx`, `frontend/public/`). No code was
modified — this is a read-only assessment.

---

## TL;DR

The **application layer is unusually far along** for a project this size — 171 backend tests, 33
frontend tests, all green, and the tracker shows a level of self-auditing (bug-finding, business-rule
verification, regression tracking) that most real production codebases don't have. The gap to
"production ready" is **not** more features. It's almost entirely **operational**: nothing runs this
outside a developer's laptop yet. No CI/CD, no deployment pipeline, no error monitoring, no rate
limiting, no real third-party credentials, no backups, no legal pages. These are the things a working
demo doesn't need and a real product cannot launch without.

### Completion estimate

| Area | Estimate | Why |
|---|---|---|
| **Core feature completeness** (PRD scope) | **~85%** | Nearly every functional requirement is built and tested; gaps are explicitly scoped-out items (see §2) |
| **Operational readiness** (can it run safely for real users) | **~20%** | No CI/CD, no deployment target, no monitoring, no rate limiting, no backups |
| **Third-party integrations actually live** | **~15%** | R2, Bunny Stream, Resend, Google OAuth are all wired in code but every credential is still a blank placeholder |
| **Security hardening** | **~45%** | Strong auth/authorization/audit-log foundations; missing rate limiting, CORS config, secrets hygiene |
| **Legal/compliance** | **~30%** | Data export/deactivation exist; no ToS, privacy policy, refund policy, or cookie notice |
| **Blended "ready to onboard real paying users" estimate** | **~55–60%** | Weighted toward the operational gaps, since those are launch-blocking regardless of feature depth |

Treat the single blended number loosely — it's a genuinely lopsided project (excellent feature depth,
near-zero ops maturity), and averaging those into one figure hides that shape more than it reveals it.

---

## 1. Critical — blocks a real launch

These aren't polish. Any one of these can take the site down, leak data, or silently drop user
actions in production.

### 1.1 No deployment pipeline or hosting target exists at all
The tracker's own item **0.6 "Deployment pipeline: app servers, queue workers, scheduler" is marked
"Not started."** There's no `Dockerfile`, no `docker-compose.yml`, no `.github/workflows/`, no Forge/
Vapor/Railway config — nothing. Right now this only runs via `composer run dev` (concurrently: `php
artisan serve` + `queue:listen` + `pail` + `vite`) on a developer machine.

**Implement:**
- Pick a target: **Laravel Forge** (simplest for a solo/small team — handles Nginx, PHP-FPM, queue
  workers, scheduler cron, zero-downtime deploys, SSL) or a container path (Dockerfile for PHP-FPM +
  Nginx, `docker-compose.yml` for local parity, then Fly.io/Railway/ECS). Given the team size implied
  by this codebase, **Forge is the pragmatic default** — it removes almost all the items below (queue
  supervision, cron, SSL, zero-downtime deploys) as a side effect of using it.
- Separate `staging` and `production` environments, each with their own `.env`, database, and R2
  bucket/prefix — never test against production data.
- A CI pipeline (even a minimal one) that runs `composer test`, `./vendor/bin/pint --test`,
  `./vendor/bin/phpstan analyse`, and the frontend's `tsc -b`/`eslint .`/`vitest run` on every PR —
  this project already has all four checks defined and green locally; wiring them into GitHub Actions
  is close to copy-paste from the existing `composer.json` scripts and `frontend/package.json`.

### 1.2 Scheduled jobs will never run
`routes/console.php` schedules two commands (`enrolments:send-due-confirmation-emails`,
`progress:evaluate-module-unlocks`) every 5 minutes — but Laravel's scheduler only fires if something
calls `php artisan schedule:run` every minute via a real cron entry (or `schedule:work` as a
supervised process). **No such cron/process exists anywhere in this repo or its deployment config**
(because there is no deployment config). Until this is wired up: enrolment confirmation emails never
send on their own (only the inline dispatch on enrolment does), and module unlocks never re-evaluate
on a schedule (only on-demand when a student loads their progress page) — so a student who doesn't
revisit a course won't unlock module 2 the moment it becomes eligible, only whenever they next check.

**Implement:** a single cron line (`* * * * * cd /path && php artisan schedule:run >> /dev/null 2>&1`)
on the deploy target, or `schedule:work` as a systemd/Forge-managed daemon. Trivial once §1.1 exists.

### 1.3 No queue worker supervision
`QUEUE_CONNECTION=database` in `.env.example` — meaning certificate PDF generation
(`GenerateCertificatePdf`), provisioning emails (`UserProvisionedQueued`), confirmation emails, and
CSV import (`ImportEnrolmentsFromCsv`) all depend on a `php artisan queue:work` process actually
running continuously. There's no Supervisor config, no Horizon, nothing to restart a crashed worker
or run more than one process. **Every one of these features silently does nothing in production
until a worker is stood up** — jobs just queue in the `jobs` table forever.

**Implement:** Supervisor (or Forge's built-in daemon manager) running `queue:work --tries=3
--backoff=30` with a process count matched to job volume; consider `laravel/horizon` once on Redis
(see §1.4) for dashboarded queue monitoring instead of blind trust that workers are alive.

### 1.4 Cache/session/queue all share the database, with no Redis in play
`.env.example` sets `CACHE_STORE=database`, `SESSION_DRIVER=database`, `QUEUE_CONNECTION=database` —
Redis config exists but is unused (tracker 0.5 confirms this was a deliberate local stand-in "same job
code, swap `QUEUE_CONNECTION=redis` for staging/prod"). Running all three off MySQL works fine at
current scale but adds write contention on the same tables serving actual application queries, and
loses Redis's atomic locks (relevant to this app's `ShouldBeUnique` jobs, which need a real lock
store to be race-safe — the database driver's uniqueness lock is weaker than Redis's).

**Implement:** provision Redis before launch (a $10–15/mo managed instance is enough at this scale —
Upstash, Redis Cloud, or a Forge-provisioned box), flip `CACHE_STORE`/`SESSION_DRIVER`/
`QUEUE_CONNECTION` to `redis`, done — the code doesn't change, only the driver.

### 1.5 No rate limiting anywhere
A repo-wide search for `throttle` in `routes/api.php` returns nothing. Laravel 11+ no longer applies
a default `throttle:api` automatically — it must be added explicitly, and it wasn't. **Login,
register, password-reset, and every other endpoint are completely unthrottled.** This is a real
brute-force and cost-DoS exposure (an attacker can hammer `/login` or the CSV import endpoint with no
backpressure at all).

**Implement:** add `throttle:60,1` (or tighter) globally in `bootstrap/app.php`'s API middleware
group, plus a stricter `throttle:5,1` specifically on `/login`, `/register`, `/forgot-password`, and
`/orders/{order}/payment-submissions` (financial-adjacent, worth extra care). Laravel's built-in
`RateLimiter::for()` in a service provider is the standard place to define these.

### 1.6 CORS is unconfigured
No `config/cors.php` exists anywhere in the repo. Laravel 11+ ships `HandleCors` in the global
middleware stack by default, but without a published config file its behavior for a genuinely
cross-origin deployment (API on `api.resnet.example`, frontend SPA on `app.resnet.example` — a very
likely real-world split) is undefined/unverified. Sanctum's stateful-domain resolution (confirmed in
`config/sanctum.php`) does pull from `FRONTEND_URL`, which helps, but CORS and Sanctum-stateful are
two different layers — one needs `allowed_origins` + `supports_credentials: true` explicitly, the
other needs the stateful-domains list. If frontend and backend end up on different subdomains in
production, cookie-based Sanctum auth **will silently fail** (browsers reject `Access-Control-Allow-
Origin: *` combined with credentialed requests) unless this is deliberately configured.

**Implement:** `php artisan config:publish cors` and explicitly set `allowed_origins` to the exact
production frontend URL(s), `supports_credentials: true`. Test this specifically in staging with the
frontend and backend on genuinely different hosts before launch — don't let same-origin local dev mask
this.

### 1.7 `APP_DEBUG` and log rotation defaults are dev-shaped
`.env.example` ships `APP_DEBUG=true` and `LOG_STACK=single` (a single ever-growing `laravel.log`
file, no rotation, no retention). Both are reasonable dev defaults and both are dangerous if copied
verbatim into production: `APP_DEBUG=true` leaks full stack traces (including env values in some
error pages) to any visitor who triggers a 500; `single`-channel logging means the log file grows
forever and nothing ever gets pruned.

**Implement:** production `.env` must set `APP_DEBUG=false`, `LOG_STACK=daily` (the `daily` channel
already exists in `config/logging.php` with a configurable `LOG_DAILY_DAYS`, default 14 — just needs
to be selected). Document this explicitly in a deploy checklist so it's never missed on a fresh
environment setup.

### 1.8 No error monitoring / APM
`composer.json` has no Sentry/Bugsnag/Flare package; the frontend `package.json` has no
`@sentry/react` either, and a repo-wide search for `ErrorBoundary`/`componentDidCatch` in
`frontend/src` returns **zero matches** — meaning an uncaught render error anywhere in the React app
currently blanks the entire page with no fallback UI and no record that it happened. Combined with
§1.7's log-only backend error visibility, **there is currently no way to know when something breaks
in production** short of a user complaining.

**Implement:**
- Backend: Sentry's Laravel SDK (`sentry/sentry-laravel`) — a few lines in `bootstrap/app.php`'s
  exception handling, captures unhandled exceptions with request context automatically.
- Frontend: a top-level `<ErrorBoundary>` wrapping `<App />` in `main.tsx` (currently nothing sits
  between a render crash and a blank white screen) plus `@sentry/react` for the same visibility Sentry
  gives the backend.
- A `/up` health check already exists (Laravel's default) — wire it into an uptime monitor
  (UptimeRobot, Better Uptime, or your host's built-in health check) so downtime pages someone instead
  of being discovered by a user.

### 1.9 No database backup strategy
Nothing in the repo defines a backup schedule, retention policy, or restore procedure — this is
purely a hosting-target concern, but it's unaddressed anywhere in the tracker or config.

**Implement:** automated daily MySQL backups with at least 7–30 day retention (managed DB providers —
PlanetScale, RDS, DigitalOcean Managed MySQL — usually include this; a self-managed box needs
`mysqldump` on a cron piped to S3/R2). Actually **test a restore** before launch, not just confirm
backups exist.

---

## 2. Feature gaps already tracked, worth prioritizing before/at launch

These are honestly documented in the project tracker already — listed here because "known and
scoped" is different from "not a launch risk." Ranked by how much they matter for a real cohort of
paying students.

| Gap | Tracker ref | Why it matters for launch |
|---|---|---|
| **No real payment gateway** — students submit a manual receipt image, an admin manually confirms it | 7.1, 7.9 | This is the single biggest gap between "functional LMS" and "sellable product." Manual receipt review doesn't scale past a handful of students and has zero fraud protection. Prioritize integrating a real gateway (Stripe, Paystack, Flutterwave — pick based on your students' actual payment methods/geography) against the existing `orders`/`payment_submissions` tables, which are already shaped correctly for this |
| **Bunny Stream not actually wired** — video resources store a `bunny_stream_video_id` but nothing calls Bunny's API to create/upload/sign; the course player uses a **simulated** video timer, not real playback | 2.5, 2.17 | If video is a core content type for your courses, this needs real integration before students see actual videos rather than a fake progress timer |
| **Notifications are in-app only** — no email/SMS/push fan-out for any event (grade posted, forum reply, module unlocked, etc.) | 5.9 | Students who don't habitually check the in-app bell will miss everything. At minimum, wire the already-integrated Resend for a subset of high-value notifications (grade posted, certificate issued, payment confirmed) |
| **"Assignment due soon" reminder** never built | 5.9 | Explicitly flagged as deferred, not forgotten — small, well-scoped follow-up |
| **Applications page is mock data**, not a real backend | 7.5–7.6 | Low risk if this page isn't actually customer-facing; confirm before launch whether admins currently rely on it for real decisions |
| **Plagiarism detection** — schema/flag exist, no vendor integrated | 3.5 | Only matters if plagiarism checking is a real requirement for your instructors; otherwise fine to stay deferred |
| **In-browser lesson/quiz authoring** — content must be uploaded as files, no WYSIWYG builder | 7.3 | Affects instructor onboarding friction, not correctness — worth a decision on whether instructors can realistically produce content without this |
| **Real-time delivery** (websockets for messages/forum) | 5.10 | Explicitly optional; polling via TanStack Query works, just not instant |
| **Waitlisting for full courses** | 7.2 | Only matters if you expect real capacity constraints |

---

## 3. Third-party integrations: wired in code, not live

Every one of these has real integration code already written and tested against fakes/mocks — they
just need real credentials and a first real-world smoke test:

- **Cloudflare R2** (`R2_ACCESS_KEY`/`R2_SECRET_KEY`/`R2_BUCKET`/`R2_ENDPOINT`/`R2_URL`) — all blank
  in `.env.example`/`.env`. Until filled in, every upload endpoint (avatars, thumbnails, resource
  files, forum attachments, receipts, certificates) will hit an unconfigured bucket in any real
  environment.
- **Bunny Stream** (`BUNNY_STREAM_LIBRARY_ID`/`_API_KEY`/`_CDN_HOSTNAME`) — blank, and per §2, no code
  actually calls Bunny's API yet regardless.
- **Resend** (`RESEND_API_KEY`) — blank; `MAIL_MAILER=log` by default means all mail currently just
  writes to the log file, nothing is actually sent.
- **Google OAuth** (`GOOGLE_CLIENT_ID`/`_SECRET`) — blank; "Sign in with Google" won't function until
  a real OAuth app is registered.

**Implement:** before any real launch, this is a checklist, not a design task — create the real
accounts, generate the credentials, fill in production `.env`, and do one manual smoke test per
integration (upload a real avatar to confirm it lands in R2 and resolves to a real URL; send one real
password-reset email; complete one real Google login).

---

## 4. Security — beyond what's already strong

The authorization layer here is genuinely solid (Policy classes gating every mutation, an actual audit
log on sensitive changes, a normalized JSON error envelope, email verification, invite-link
onboarding instead of admin-typed passwords). The gaps are narrower than a typical audit finds:

- **No 2FA** for admin/instructor accounts — worth adding at least for admins, given they can change
  any user's role/status and issue refunds-equivalent (order adjustments). Laravel Fortify or a
  simple TOTP package layers onto Sanctum without much friction.
- **File upload validation is MIME/size only** (confirmed via the R2 migration's validation rules) —
  no virus/malware scanning on uploaded files (receipts, forum attachments, resource documents).
  Low-probability but non-zero risk on a public-facing upload surface; a lightweight ClamAV pass or a
  paid scanning API (e.g. via a queued job after upload) closes this if it matters for your risk
  tolerance.
- **Secrets hygiene**: confirmed the local `.env` already has real-looking R2 keys checked into a
  file the assistant could read directly during this session — make sure `.env` is genuinely
  git-ignored (it is, per `.gitignore`) and that whatever secrets manager the deploy target uses
  (Forge's env editor, a vault, GitHub Actions secrets) is the actual source of truth in production,
  not a copied `.env` file sitting on a server.
- **Session security**: `SESSION_ENCRYPT=false` by default — fine functionally (Laravel signs
  cookies regardless) but consider `true` for defense-in-depth once on HTTPS in production, which
  costs nothing.

---

## 5. Legal & compliance

Phase 6.6 built genuine data-export/deactivation capability (`GET /me/data-export`, `POST
/me/request-deactivation`) — real substance, not a checkbox. What's still missing is the
**user-facing legal surface** a real product needs regardless of technical data handling:

- **Terms of Service** and **Privacy Policy** pages — currently no legal pages exist anywhere in the
  frontend routes.
- **Refund/cancellation policy** — directly relevant given this is a paid course platform; should be
  written and linked before real payments flow through it.
- **Cookie/consent notice** — depends on your students' jurisdiction; if any EU/UK/similar users are
  expected, this isn't optional.

**Implement:** these are largely a content/legal-drafting task, not an engineering one — a lawyer or
a solid template service (e.g. Termly) for the actual text, then two or three new static pages in
`frontend/src/features/` linked from the footer (`PublicLayout.tsx` already has one).

---

## 6. Frontend production concerns

- **No SEO surface**: `frontend/public/` contains only `favicon.svg` and `icons.svg` — no
  `robots.txt`, no `sitemap.xml`, no Open Graph/meta-description tags on the public catalogue pages.
  If organic discovery of courses matters at all, this is worth an hour of work for real payoff.
- **No error boundary** (§1.8) — the single highest-value one-file fix in this entire report.
- **No analytics** — no PostHog/GA/Plausible anywhere; you'll have zero visibility into real user
  behavior (drop-off points, which courses get browsed vs. enrolled) without one.
- **Bundle/perf**: nothing in the report checks actual bundle size or Lighthouse scores — worth a
  pass once real hosting exists, low priority before then.

---

## 7. What's genuinely strong (don't second-guess these)

Worth naming explicitly so effort doesn't get misdirected toward re-litigating things that are
already solid:

- **Test coverage and discipline**: 171 backend / 33 frontend tests, and the tracker shows a
  consistent pattern of catching real bugs via tests (stale factory state, missing authorization
  checks, N-second test flakiness) rather than shipping untested guesses.
- **Authorization model**: Policy-gated everywhere, audit-logged on sensitive mutations, self-lockout
  prevention on admin role changes — this is more careful than most MVPs.
- **API error contract**: one normalized JSON error shape (`bootstrap/app.php`), OpenAPI docs
  auto-generated via `dedoc/scramble` — genuinely good API hygiene.
- **Business-rule fidelity**: features like tiered late-penalty bands, sequential module locking, and
  certificate issue-exactly-once are implemented with real edge-case tests, not just happy-path code.

---

## 8. Suggested implementation order

Roughly in the order that unblocks the next thing and minimizes risk:

1. **Stand up hosting** (Forge or equivalent) with staging + production, wire the cron/queue-worker/
   Redis pieces (§1.1–1.4) — this single step also resolves the scheduler and queue-worker gaps as a
   byproduct.
2. **Fill in real credentials** for R2, Resend, Google OAuth (§3) and smoke-test each.
3. **Security floor**: rate limiting, CORS config, `APP_DEBUG=false`/`LOG_STACK=daily`, error
   monitoring, frontend error boundary (§1.5–1.8) — all small, independent, high-value.
4. **Backups + uptime monitoring** (§1.9, §1.8) — cheap insurance, do before real user data exists.
5. **Legal pages** (§5) — needed before real payments, not before a private beta.
6. **Payment gateway integration** (§2) — the biggest remaining feature gap if this is meant to be a
   real paid product rather than a manually-invoiced one.
7. **Bunny Stream real integration** (§2) — if video content is core to the offering.
8. **Everything else in §2** — prioritize based on actual instructor/student feedback once a small
   real cohort is using it, rather than guessing further.
