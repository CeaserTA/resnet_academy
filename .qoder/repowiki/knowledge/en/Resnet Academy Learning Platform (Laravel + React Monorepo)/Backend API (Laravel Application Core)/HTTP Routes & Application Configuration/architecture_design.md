Two concerns are grouped here: routing and configuration.

- Routing (`routes/`):
  - `api.php` declares a single `/api/v1` namespace with `auth:sanctum` middleware; public catalogue endpoints sit outside the auth group while all write/admin endpoints are nested under it. Controllers live in `App\Http\Controllers\Api\V1\*` (and an `Admin` sub-namespace), giving a flat REST surface over course, module, resource, assignment, evaluation, forum, ticket, messaging, analytics, certificate, enrolment, and notification domains.
  - `web.php` hosts session-based SPA auth routes under the same `/api/v1` prefix so the React SPA has one URL base; it `require`s `auth.php` and adds Google OAuth redirect/callback plus account deactivation/logout-other-sessions endpoints that must run behind the `web` middleware group to use cookies/CSRF.
  - `auth.php` is a standalone file of guest/authenticated session routes (register, login, password reset, email verification, logout).
  - `console.php` registers Artisan commands and schedules three recurring tasks via `Schedule::command`: enrollment confirmation emails, module-unlock evaluation, and soft-deleted module purging.

- Configuration (`config/`): standard Laravel config files driven by `.env` variables. Key cross-cutting settings:
  - `sanctum.php` configures stateful domains from `SANCTUM_STATEFUL_DOMAINS` and `FRONTEND_URL`, uses the `web` guard, and maps custom middleware aliases for session/cookie/CSRF handling.
  - `cors.php` allows all paths/methods/headers, whitelists origins from `FRONTEND_URL` plus localhost dev ports, and enables credentials.
  - `app.php` centralizes app name, env, debug, timezone, locale, encryption cipher/key, maintenance driver/store, and the `frontend_url` used for redirects after browser-navigated flows (email verification, OAuth callbacks).

Dependency direction is outward-only: routes depend on controllers/services; config files are read-only at runtime and consumed by framework bootstrapping.