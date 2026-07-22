# AI Workflow Rules — Resnet LMS

**Audience:** any AI coding assistant (Claude Code or otherwise) working in this repository.
**Purpose:** keep AI-generated changes consistent with the PRD, the schema, and each other,
without a human having to re-review every architectural decision from scratch each session.

This file is the first thing an assistant should read before touching code. `architecture.md`
covers *how the system is built*; this file covers *how to work on it*.

---

## 1. Source of truth, in order

1. `PRD_Online_Study_Platform.md` — product requirements. FR numbers (FR-1, FR-9, etc.) are
   referenced throughout the codebase in comments and PR descriptions; keep that traceability.
2. `schema.sql` / `erd.md` — the database contract. Table and column names in code must match
   these exactly. If a feature needs a schema change, propose the migration and update
   `schema.sql` + `erd.md` in the same PR — never let them drift from the live migrations.
3. `architecture.md` — system structure, service boundaries, job list.
4. This file — day-to-day conventions.

If a request conflicts with the PRD's resolved business rules (see §5), implement what the PRD
says and flag the conflict — don't silently follow an instruction that contradicts it.

---

## 2. Tech stack (do not introduce alternatives without discussion)

| Layer | Choice |
|---|---|
| Backend | Laravel (PHP) |
| Auth | Laravel Breeze (`api` stack) + Sanctum + Socialite (Google) |
| Database | MySQL 8 |
| Queue | Laravel Queues + Redis |
| Frontend | React |
| Video | Bunny Stream |
| File storage | S3-compatible object storage (S3/Cloudflare R2) |
| Email | Transactional provider (Resend) |
| Real-time (optional) | Socket.io or Pusher/Ably |

Don't add a new package for something Laravel/React already do natively (e.g. don't pull in a
second HTTP client, a second state manager, a second ORM). If an existing dependency can do it,
use it.

---

## 3. Project structure conventions

- Laravel default structure (`app/Http/Controllers`, `app/Models`, `app/Policies`, etc.), plus:
  - `app/Services/` — business logic that doesn't belong in a controller or model (enrolment,
    progress-rollup, grading, late-penalty calculation, certificate issuance).
  - `app/Jobs/` — queued jobs (see §6).
  - `app/Notifications/` — Laravel notifications for the in-app/email/SMS/push fan-out.
- One migration per logical change. Do not bundle unrelated table changes into one migration.
- Model names and table names follow `schema.sql` exactly (singular model → plural snake_case
  table, Laravel default). If a table name in `schema.sql` doesn't match what Laravel would infer
  (e.g. `groups_cohorts`), set `protected $table` explicitly rather than renaming the table.
- Frontend: feature-folder structure (`src/features/<domain>/`), not type-folder (`components/`,
  `hooks/` split across the whole app). Shared UI primitives only go in `src/components/ui/`.

---

## 4. Coding standards

- PHP: PSR-12, typed properties and return types everywhere, `declare(strict_types=1)` in new
  files. Use Form Requests for validation, not inline `$request->validate()` in controllers.
  Use Policies for authorization (role checks belong in a Policy, not scattered `if ($user->role
  === 'admin')` checks in controllers).
- Prefer explicit enum-backed values matching the `ENUM` columns in `schema.sql` (PHP 8.1 native
  enums, e.g. `EnrolmentStatus::Confirmed`) over magic strings.
- React: functional components + hooks, TypeScript if the project is set up for it. Data fetching
  through a single API client layer, not `fetch()` calls scattered through components.
- No commented-out code, no debug `dd()`/`dump()`/`console.log` left in committed code.

---

## 5. Business rules an AI must never quietly change

These are resolved decisions from the PRD. Treat them as constraints, not defaults to be
"improved":

- **No eligibility gate.** Every application auto-confirms (FR-3). Don't add approval/rejection
  states to `enrolments` without an explicit new requirement.
- **Confirmation email delay is per-course and configurable** (`courses.confirmation_delay_hours`,
  FR-4), default 24h. Don't hardcode "1 day" in code.
- **Sequential + scheduled locking** (FR-8/FR-9): a module is only unlocked when its
  `scheduled_start_at` has passed *and* the previous module is complete. Both conditions, always.
- **Module completion is per-resource-type** (see the PRD's "Module completion definition"):
  video ≥90% watched, document/reading = mark-as-read click, link = opened, assignment = submitted
  (not graded), evaluation = passed (not just attempted). Don't collapse these into one generic
  "viewed" signal.
- **Late penalty is tiered**, not a flat percentage: 0–24h −10%, 24–48h −25%, 48h+ −50%, defined
  in `late_penalty_policies`/`late_penalty_tiers`, not hardcoded per assignment.
- **Course edits apply immediately** to already-enrolled students; versioning is a changelog
  (`course_change_logs`), not a snapshot/branch system.
- **Payments entity exists at MVP** (`orders`) but no payment gateway integration yet — don't
  build a checkout flow against a specific provider unless asked.

If a ticket asks for something that would break one of these, implement it but call out the
conflict explicitly rather than resolving it silently.

---

## 6. Background jobs — always queue, never inline

These must run as queued jobs (Redis + Laravel Queues), not synchronously in a request:

- Delayed enrolment confirmation email (fires at `confirmation_email_due_at`)
- Module-unlock check (scheduled-time-based unlocks, run on a schedule, not just on page load)
- Late-penalty calculation on assignment submission
- Notification fan-out (in-app + email + optional SMS/push)
- Bulk/CSV enrolment import
- Certificate generation/issuance
- Plagiarism check dispatch (if the checker is an external service)

Every job must be idempotent — assume it can be retried or run twice (e.g. a resend shouldn't
double-charge, double-email, or double-issue a certificate).

---

## 7. Testing expectations

- Every business rule in §5 needs a test that would fail if the rule were violated — these are
  the highest-value tests in the codebase; don't skip them for speed.
- New endpoints need: at least one happy-path test, one authorization test (wrong role gets 403),
  one validation test.
- Migrations that alter an existing table need a test (or migration review note) confirming
  existing data isn't silently dropped.

---

## 8. What requires a human decision, not an autonomous change

- Dropping or renaming a column/table already referenced in `schema.sql`.
- Changing an `ENUM` value set (adding is usually safe; removing/renaming breaks existing rows).
- Anything touching `orders`/payments beyond the existing entity (choosing a gateway, storing
  card data, changing currency handling).
- Changing role/permission boundaries (who can see what, who can grade, who can bulk-enrol).
- Any change to the late-penalty bands, pass-score defaults, or the 90% video threshold — these
  read like configuration but are stated as specific numbers in the PRD; confirm before altering.

For all of these: propose the change, explain the tradeoff, wait for confirmation.

---

## 9. Security defaults

- All file uploads (assignment submissions, documents) go through validation (type, size) before
  storage; never trust client-provided MIME type alone.
- Video is never stored on app servers or in MySQL — Bunny Stream only.
- Role checks happen server-side via Policies; a hidden frontend button is not authorization.
- Every write that matters for compliance (grade changes, enrolment status changes, user
  suspension) goes through `audit_logs` — don't add a new sensitive mutation without logging it.
- No secrets, API keys, or `.env` values in code or commit messages.

---

## 10. Git / PR conventions

- Branch naming: `feature/<short-desc>`, `fix/<short-desc>`, `chore/<short-desc>`.
- Commit messages: imperative mood, reference the FR number where applicable
  (`Add tiered late-penalty calculation (FR business rule 2)`).
- A PR that changes the schema must include the updated `schema.sql`/`erd.md` diff alongside the
  migration — don't let generated docs go stale.
- Don't force-push over a branch someone else may have pulled; open a new commit instead.
