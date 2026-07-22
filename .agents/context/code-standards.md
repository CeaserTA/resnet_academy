# Code Standards — Resnet LMS

Expands `ai-workflow-rules.md` §4 into the actual rules a linter/reviewer enforces. If something
here and `ai-workflow-rules.md` disagree, this file wins for *style*; that file wins for
*business-rule* judgment calls.

---

## 1. General principles

- Optimize for the next reader, not for cleverness. If a reviewer has to re-read a line twice,
  rewrite it.
- No dead code, no commented-out blocks, no `dd()`/`dump()`/`var_dump()`/`console.log` in
  anything merged to `main`.
- A function/method does one thing. If you're describing it with "and", split it.
- Match the vocabulary in `schema.sql` and the PRD's FR numbers — don't invent a second name for
  something that already has one (e.g. it's `enrolments`, not `registrations`; it's
  `evaluations`, not `quizzes`, in code).

---

## 2. PHP / Laravel

**Formatting & static analysis**
- PSR-12, enforced by **Laravel Pint** (default preset) — run before every commit, CI blocks on
  violations.
- **Larastan (PHPStan)** at level 6+ — CI blocks on new errors; don't suppress with
  `@phpstan-ignore` without a comment explaining why.
- `declare(strict_types=1);` at the top of every new PHP file.
- Typed properties, typed method parameters, typed return types everywhere — no bare `mixed`
  unless the value genuinely varies (e.g. `JSON` columns like `event_meta`).

**Naming**
- Classes: `PascalCase`. Methods/variables: `camelCase`. Constants/enum cases: `PascalCase` for
  PHP 8.1 native enums (`EnrolmentStatus::Confirmed`), not `SCREAMING_SNAKE`.
- Models are singular (`Enrolment`, `ModuleItem`), tables are the plural snake_case name from
  `schema.sql` (`enrolments`, `module_items`) — set `protected $table` explicitly if Laravel's
  auto-pluralization would guess wrong (e.g. `GroupsCohort` model → `groups_cohorts` table).
- Booleans: `is_`/`has_`/`can_` prefix (`isRequired`, `hasPassed`), matching the `is_required`
  style already used in `schema.sql`.
- Enum-backed status columns get a PHP enum class in `app/Enums/`, one per column
  (`EnrolmentStatus`, `ModuleProgressStatus`, `SubmissionStatus`) — never compare against a raw
  string literal in application code.

**Structure**
- Controllers stay thin: validate (Form Request) → authorize (Policy) → call a Service → return
  an API Resource. No business logic in controllers.
- Business logic lives in `app/Services/<Domain>/`, one class per cohesive responsibility (e.g.
  `ProgressEngine::evaluateModuleCompletion()`, not a single `LmsService` god class).
- Every model with role-based access gets a matching `app/Policies/<Model>Policy.php`, registered
  in `AuthServiceProvider`. Authorization checks happen in the Policy, not inline in controllers
  or Blade/React conditionals.
- API responses go through `app/Http/Resources/` (Laravel API Resources) — never
  `return $model;` or `return response()->json($model->toArray())` directly, so we control what
  crosses the wire (e.g. never leak `password_hash`).
- Queued jobs (`app/Jobs/`) must implement `ShouldBeUnique` or an explicit idempotency check
  where re-running would double-send/double-charge/double-issue (see
  `ai-workflow-rules.md` §6).

**Eloquent**
- Eager-load relationships used in a list endpoint (`with([...])`) — no N+1 queries in anything
  that returns a collection. CI/PR review should flag this in a Laravel Debugbar / query-count
  check on key endpoints (course catalogue, gradebook, forum thread list).
- Relationship method names match `schema.sql` foreign keys: `Enrolment::student()`,
  `Enrolment::course()`, `Module::items()`, not abbreviated or renamed variants.
- No raw SQL in controllers/services unless the query genuinely can't be expressed in the query
  builder (e.g. a complex analytics aggregate) — and if so, it's isolated in a dedicated
  Repository/Query class with a comment explaining why.

**Migrations**
- One logical change per migration file. Filename: Laravel's standard timestamp +
  `create_<table>_table` / `add_<column>_to_<table>_table` / `modify_<table>_table`.
- Every foreign key gets an explicit constraint name matching the `fk_<short>_<ref>` pattern
  already used in `schema.sql`, and an explicit `onDelete()` — don't rely on Laravel's default.
- Adding a nullable column or a new enum case = safe, no migration review flag needed. Dropping/
  renaming a column, or removing an enum case, requires the human sign-off called out in
  `ai-workflow-rules.md` §8.

**Testing**
- Pest (preferred) or PHPUnit, consistently — don't mix styles within the same test directory.
- Feature tests hit routes through the HTTP kernel (`$this->postJson(...)`), not by calling
  service methods directly, for anything that's actually an endpoint.
- Every business rule in `ai-workflow-rules.md` §5 has a named test that states the rule in the
  test description, e.g. `it('locks module 2 until module 1 is completed even if scheduled_start_at has passed')`.
- Factories (`database/factories/`) for every model that appears in a test — no hand-built arrays
  standing in for a model.

---

## 3. Database (recap from `schema.sql`, enforced at migration-review time)

- All tables: `InnoDB`, `utf8mb4`.
- Every table has `created_at`; add `updated_at` only if the row is actually ever updated
  (e.g. `enrolments` doesn't need one — confirmation is the only mutation, tracked by its own
  timestamp column).
- Status columns are `ENUM`, not free-text `VARCHAR` + app-level validation.
- Money: `DECIMAL(10,2)`, never `FLOAT`/`DOUBLE`.
- Every foreign key is indexed (either via the FK itself or an explicit composite index if it's
  part of a `WHERE`/`ORDER BY` pattern, e.g. `idx_modules_course_order`).

---

## 4. React / Frontend

**Formatting & linting**
- **ESLint** (recommended + `react-hooks` plugin rules as errors, not warnings) + **Prettier** —
  both run in CI, both block merge on failure.
- TypeScript, `strict: true`. No `any` without a comment explaining why it's unavoidable (e.g. a
  third-party type gap).

**Structure**
- Feature-folder layout: `src/features/<domain>/` (e.g. `features/enrolment/`,
  `features/gradebook/`) containing that feature's components, hooks, and API calls together.
  `src/components/ui/` is for genuinely shared primitives only (Button, Modal, Table) — if a
  component is used by one feature, it lives in that feature's folder.
- One component per file, file name matches the component name (`ModuleCard.tsx` exports
  `ModuleCard`).
- All server communication goes through a single typed API client (`src/lib/api/`) — no
  ad hoc `fetch()` in components. Response types mirror the API Resource shapes on the backend.

**Components & hooks**
- Functional components only. Props typed with an explicit `interface Props { ... }`, not inline
  object types, for anything with more than 2 props.
- Custom hooks (`useX`) for any logic reused across 2+ components, or for isolating
  data-fetching/subscription logic out of a component body.
- No business logic duplicated between frontend and backend — e.g. the frontend can show an
  optimistic "90% watched" progress bar, but the *authoritative* completion check happens
  server-side in the Progress Engine (see `architecture.md` §5.3). Never trust a client-computed
  completion state.

**Styling**
- Utility-first (Tailwind) or a single consistent approach — don't mix CSS-in-JS, CSS modules,
  and utility classes in the same codebase. Whichever is chosen at project start, it's the only
  one.
- Accessibility is not optional: every interactive element keyboard-reachable, form inputs have
  associated labels, images/video have alt text/captions (ties to the WCAG 2.1 AA requirement in
  `architecture.md` §8).

**Testing**
- React Testing Library + Jest/Vitest. Test user-visible behavior ("clicking submit shows a
  validation error"), not implementation details ("state variable changed").

---

## 5. Git / commits / PRs

- **Commit format:** Conventional Commits — `feat:`, `fix:`, `chore:`, `refactor:`, `test:`,
  `docs:`, imperative mood (`feat: add tiered late-penalty calculation`, not `Added...`).
- **Branch naming:** `feature/<short-desc>`, `fix/<short-desc>`, `chore/<short-desc>`.
- **PR description must include:**
  - What FR(s)/business rule(s) this implements or touches.
  - Any schema change, with the `schema.sql`/`erd.md` diff.
  - Test coverage added for the change.
- **PR size:** prefer small, reviewable PRs scoped to one feature/fix. A PR that touches more
  than ~400 lines of non-generated code is a signal to split it.
- **CI gates, all required before merge:** Pint, Larastan, PHP tests, ESLint, Prettier check,
  frontend tests. No merging with a red check, no `--no-verify`.

---

## 6. Documentation

- Every Service class and every non-obvious method gets a docblock explaining *why*, not just
  restating the method name.
- Any change to `schema.sql`/`erd.md` lands in the same PR as the migration that causes it —
  never a follow-up "update docs" PR.
- `README.md` per major module/feature folder if its setup or conventions aren't obvious from the
  code alone (e.g. how the Bunny Stream integration is configured locally).
