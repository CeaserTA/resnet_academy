---
kind: error_handling
name: Laravel-Default Error Handling with Middleware-Gated Business Errors
category: error_handling
scope:
    - '**'
source_files:
    - app/Http/Controllers/Controller.php
    - app/Http/Requests/Auth/LoginRequest.php
    - app/Http/Middleware/EnsureEmailIsVerified.php
    - app/Http/Middleware/EnsureProfileComplete.php
    - config/logging.php
    - config/app.php
---

## 1. System / Approach

The codebase relies on Laravel's built-in exception-to-HTTP pipeline — there is no custom app/Exceptions directory and no application-specific exception classes. Validation errors are raised via Illuminate\Validation\ValidationException (thrown by FormRequest::validate() or explicitly in LoginRequest::authenticate() / ensureIsNotRateLimited()), and business-level access-control failures are handled through Laravel Policies combined with the AuthorizesRequests trait used by the base App\Http\Controllers\Controller. The framework's default exception handler converts these into JSON responses for API routes.

There is no resources/views/errors Blade error template set; the project does not override Laravel's default HTML error page rendering, so unhandled exceptions fall through to Laravel's standard response behavior.

## 2. Key Files and Packages

- Base controller: app/Http/Controllers/Controller.php — only mixes in AuthorizesRequests; no global try/catch or custom render logic.
- Validation + auth error source: app/Http/Requests/Auth/LoginRequest.php — throws ValidationException for invalid credentials and rate-limit lockouts, using translation keys (auth.failed, auth.throttle).
- Middleware that short-circuit with JSON errors:
  - app/Http/Middleware/EnsureEmailIsVerified.php — returns 409 Conflict with { message: 'Your email address is not verified.' } when a user's email is unverified.
  - app/Http/Middleware/EnsureProfileComplete.php — returns 403 Forbidden with a structured { error: { code: 'profile_incomplete', message, missing_fields } } payload when required profile fields are missing.
- Logging configuration: config/logging.php — Monolog-based channels (single, daily, slack, papertrail, stderr, syslog, errorlog, null) stacked under a stack channel; log level and destination are driven by environment variables (LOG_CHANNEL, LOG_LEVEL, etc.). No custom logger class exists in app/.
- Application config: config/app.php — APP_DEBUG controls whether detailed stack traces are shown; APP_ENV drives environment-specific behaviour.

## 3. Architecture and Conventions

- No domain exception types: Business rules are enforced via Policies (e.g. UserPolicy, CoursePolicy, AssignmentPolicy) rather than custom exceptions. When authorization fails, Laravel's policy system raises an AuthorizationException which the framework converts to a 403/404 JSON response automatically.
- Validation is request-scoped: Each endpoint validates input through dedicated FormRequest classes under app/Http/Requests/Api/V1/ and app/Http/Requests/Auth/. Validation failures produce ValidationExceptions that Laravel serializes into a standard { message, errors } JSON body.
- Business preconditions live in middleware: Cross-cutting checks like "email verified" and "profile complete" are implemented as HTTP middleware that return early with explicit status codes and JSON bodies, keeping controllers free of guard clauses.
- Structured error payloads in middleware: EnsureProfileComplete demonstrates the preferred shape — an error object containing a machine-readable code, a human-readable message, and contextual data (missing_fields). EnsureEmailIsVerified uses a simpler { message } shape.
- Logging is infrastructure-only: The project configures Monolog channels but does not define any application-level logging calls in the code examined; runtime logs are written to storage/logs/laravel.log per the single/daily channel defaults.

## 4. Conventions and Constraints

- Do not create custom exception classes — none exist under app/Exceptions; all errors flow through Laravel's built-in handlers.
- Use FormRequest for validation — authentication and API input validation are centralized in request classes; throwing ValidationException is the prescribed way to signal client errors.
- Gate cross-cutting preconditions with middleware — EnsureEmailIsVerified and EnsureProfileComplete show the pattern: check at the middleware layer and return a typed JSON response with an appropriate HTTP status (409, 403).
- Return structured error objects from middleware — the EnsureProfileComplete response ({ error: { code, message, missing_fields } }) is the documented convention for business-rule violations; this gives the React frontend a stable shape to display actionable messages.
- Rely on Laravel Policies for authorization — the base Controller mixes AuthorizesRequests; policies enforce per-resource permissions without ad-hoc abort() calls in controllers.
- Logging is configured but not instrumented in application code — config/logging.php defines multiple channels; developers are expected to use the configured channels if they add logging, but no application code was found calling Log:: directly in the inspected scope.