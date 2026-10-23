# Backend changes from the `front-end` branch

The backend is owned by a teammate. These changes were made on the `front-end` branch so frontend
work could continue without a pile of backend requests. Each section says **what** changed,
**why**, the **files**, and how it's **tested**. Section numbers (§1, §2…) are referenced in code
comments, so `grep -rn "BACKEND_CHANGES.md §3"` finds every line belonging to a change.

**To deploy:** `php artisan migrate` (two new migrations, both additive — no existing data changes).

| § | Change | Migration | New endpoint |
|---|---|---|---|
| 1 | Grading queue for staff | — | `GET /api/v1/grading-queue`, `GET /api/v1/grading-queue/out-of-attempts` |
| 2 | No new quiz attempt while one awaits marking | — | — |
| 3 | Staff can give a student extra quiz attempts | `evaluation_attempt_allowances` | `POST /api/v1/evaluations/{evaluation}/students/{student}/extra-attempts` |
| 4 | Receipt/file links 404'd after an R2 upload fell back to local disk | — | — |
| 5 | Admin can revoke / restore a certificate | `certificates.revoked_at`, `revoked_by`, `revoke_reason` | `POST /api/v1/admin/certificates/{certificate}/revoke`, `…/restore` |

---

## §1 Grading queue

**Why:** instructors had no single place to see work waiting for a mark. The frontend had to call
`/assignments/{id}/submissions` and `/evaluations/{id}/attempts` once per item (dozens of requests).

**What:** `GET /api/v1/grading-queue[?course_id=]` returns every assignment submission and quiz
attempt in `submitted` status (= waiting for a mark), oldest first. Admins see all courses;
instructors only courses they teach (`course_instructors`). Students get 403.

Each entry: `kind` (`assignment`|`quiz`), `id` (submission/attempt id), `item_id`, `item_title`,
`module {id,title,order_index}`, `course {id,title}`, `student {id,name,email}`, `attempt_number`,
`is_late`, `submitted_at`.

`GET /api/v1/grading-queue/out-of-attempts[?course_id=]` (same access rules) lists students who
used every attempt on a quiz (`max_attempts` + any extra granted, §3) without passing and have
nothing waiting to be marked. Auto-marked quizzes never appear in the main queue, so without this
a student stuck on a required quiz was invisible to staff. Each entry: `evaluation_id`,
`evaluation_title`, `pass_score`, `module`, `course`, `student`, `attempts_used`,
`best_score_percent`, `last_attempt_at`. The list empties for that student once §3 grants an attempt.

Also: `AssignmentResource` now includes `course_id` (like `EvaluationResource` already did) so the
grading page can link back to its course.

**Files:** `app/Services/Assessment/GradingQueueService.php` (new),
`app/Http/Controllers/Api/V1/GradingQueueController.php` (new), `routes/api.php`,
`app/Http/Resources/AssignmentResource.php`.

**Tests:** `tests/Feature/Assessment/GradingQueueTest.php` — instructor scope, admin scope + filter, student denied, out-of-attempts list (and it clears after a grant).

## §2 No new quiz attempt while the last one awaits marking

**Why:** a quiz with a short-answer/essay question stays `submitted` until staff mark it. Students
kept starting new attempts meanwhile, burning all their attempts on the same questions before they
knew whether they had passed (seen in testing: 3 attempts used in 2 minutes).

**What:** `EvaluationAttemptService::start()` aborts with **422** "Your last attempt is still
waiting to be marked…" when the student has an attempt in `submitted` status for that evaluation.
Resuming an `in_progress` attempt is unchanged.

**Files:** `app/Services/Assessment/EvaluationAttemptService.php`.

**Tests:** `tests/Feature/Assessment/EvaluationAttemptTest.php` — "refuses a new attempt while the last one is waiting for manual marking".

## §3 Extra quiz attempts

**Why:** once a student used every attempt on a required quiz, nothing could unblock them — the
module, the rest of the course and the certificate were unreachable.

**What:**
- New table `evaluation_attempt_allowances` (`evaluation_id`, `student_id`, `extra_attempts`,
  `granted_by`, `reason`; unique per evaluation+student; cascades with evaluation/student).
- `Evaluation::maxAttemptsFor(User $student)` = `max_attempts` + granted extra (null = unlimited).
  Used by `EvaluationAttemptService::start()` and by `GET /evaluations/{id}/overview`
  (`max_attempts` and `attempts_remaining` there are now per student).
- `POST /api/v1/evaluations/{evaluation}/students/{student}/extra-attempts` body
  `{ attempts?: 1–5 (default 1), reason?: string }` — authorised by `EvaluationPolicy::grade`
  (admin, or instructor teaching the course). Adds to any earlier grant, writes audit log
  `evaluation.extra_attempts_granted`, sends the student an in-app notification
  (`evaluation_extra_attempt`, related entity `evaluation`).

**Files:** `database/migrations/2026_10_23_090000_create_evaluation_attempt_allowances_table.php` (new),
`app/Models/EvaluationAttemptAllowance.php` (new), `app/Models/Evaluation.php`,
`app/Services/Assessment/EvaluationAttemptService.php`,
`app/Http/Controllers/Api/V1/EvaluationAttemptController.php`,
`app/Http/Controllers/Api/V1/EvaluationController.php`, `routes/api.php`.

**Tests:** `EvaluationAttemptTest.php` — "lets staff grant extra attempts once a student has used them all" (student can't grant; admin grant raises the limit; overview and start reflect it).

## §4 File links when an R2 upload falls back to local disk

**Why:** `MediaStorageService::store()` falls back to the local `public` disk when the R2 upload
fails, but `url()` always built an R2 URL when `R2_URL` is set — so those files (payment
receipts in testing) linked to an R2 object that doesn't exist (404, blank page for the admin).

**What:** `url()` first checks whether the path exists on the local `public` disk (a cheap
filesystem call) and links there if so; otherwise behaviour is unchanged.

**Still worth looking at:** *why* the R2 upload fails for receipts. `store()`'s R2 disk has
`'throw' => false`, so the failure reason is never logged.

**Files:** `app/Services/Storage/MediaStorageService.php`.

**Tests:** `tests/Feature/Services/MediaStorageUrlTest.php`.

## §5 Revoke / restore a certificate

**Why:** admins need to withhold a certificate (payment dispute, integrity issue) without deleting it.

**What:**
- Migration adds nullable `revoked_at`, `revoked_by` (FK users, null on delete), `revoke_reason` to `certificates`.
- `Certificate::isRevoked()`.
- Revoked certificates are hidden from the student: excluded from `GET /certificates` and from the
  progress dashboard's `certificate` field; `CertificatePolicy::view` denies the student (so
  `show`/`download` return 403); public `GET /certificates/verify/{number}` returns 404 "This
  certificate has been revoked and is no longer valid." Admins still see and download them.
- `POST /admin/certificates/{certificate}/revoke` `{ reason: required }` and
  `POST /admin/certificates/{certificate}/restore` — admin only (`CertificatePolicy::revoke`).
  Both audit-logged (`certificate.revoked` / `certificate.restored`) and notify the student
  (`certificate_revoked` / `certificate_restored`).
- Admin list: `AdminCertificateResource.status` can now be `revoked` (plus `revoked_at`,
  `revoke_reason`); `?status=revoked` filter; `generating`/`ready` filters exclude revoked.
- Re-issuing on course completion uses `firstOrCreate`, so a revoked certificate stays revoked.

**Files:** `database/migrations/2026_10_23_100000_add_revocation_to_certificates_table.php` (new),
`app/Models/Certificate.php`, `app/Policies/CertificatePolicy.php`,
`app/Services/Certification/CertificateService.php`,
`app/Http/Controllers/Api/V1/Admin/CertificateController.php`,
`app/Http/Controllers/Api/V1/CertificateController.php`,
`app/Http/Controllers/Api/V1/ProgressController.php`,
`app/Http/Resources/AdminCertificateResource.php`, `routes/api.php`.

**Tests:** `tests/Feature/Certification/CertificateRevocationTest.php`.

---

## Found while testing — not changed, for the backend owner

- **Some tests write certificate PDFs to the real R2 bucket and fail** with "Failed to store
  generated file at certificates/…pdf" — e.g. `EvaluationManualGradingTest` "finalizes the score…",
  `EvaluationAttemptTest` "auto-grades an objective question…". They fail the same way with these
  changes reverted. Faking the `r2` disk in those tests (or in `TestCase`) would fix them.
- **Email:** `.env` uses Resend's test sender `onboarding@resend.dev`, which only delivers to the
  Resend account owner. Verification and other emails to anyone else fail (logged). Needs a
  verified domain and a matching `MAIL_FROM_ADDRESS`.
- **Module completion counts a submitted (ungraded) assignment as done**, so students move on
  before work is marked. Fine if intended — flagging so it's a decision, not an accident.
- PHPStan reports `Admin\CertificateController::attachCohorts()` has an untyped `$certificates`
  parameter (pre-existing).

## Local-only, not committed

- `database/seeders/LocalScenarioSeeder.php` — test students at every stage
  (`<name>@learner.resnet.test` / `password`). Hidden via `.git/info/exclude`; local database only.
