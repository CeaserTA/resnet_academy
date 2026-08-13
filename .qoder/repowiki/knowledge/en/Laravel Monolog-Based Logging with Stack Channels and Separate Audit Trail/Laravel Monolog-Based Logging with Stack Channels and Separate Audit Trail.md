---
kind: logging_system
name: Laravel Monolog-Based Logging with Stack Channels and Separate Audit Trail
category: logging_system
scope:
    - '**'
source_files:
    - config/logging.php
    - .env
    - .env.example
    - app/Services/Audit/AuditLogger.php
    - app/Jobs/GenerateCertificatePdf.php
    - app/Jobs/ImportEnrolmentsFromCsv.php
    - app/Jobs/SendEnrolmentConfirmationEmail.php
    - app/Console/Commands/ClearSeededDataExceptUsers.php
    - storage/logs/laravel.log
---

## What system/approach is used

The application uses Laravel's built-in logging subsystem, which wraps the **Monolog** PHP library. All log channels are configured in `config/logging.php` and selected at runtime via environment variables (`LOG_CHANNEL`, `LOG_STACK`, `LOG_LEVEL`). There is no custom logger framework — the codebase relies on Laravel's `Log` facade and the global `logger()` helper.

## Key files and packages

- `config/logging.php` — central channel definitions (stack, single, daily, slack, papertrail, stderr, syslog, errorlog, null, emergency).
- `.env` / `.env.example` — runtime selection: `LOG_CHANNEL=stack`, `LOG_STACK=single`, `LOG_LEVEL=debug`, `LOG_DEPRECATIONS_CHANNEL=null`.
- `storage/logs/laravel.log` — default file sink for the `single` channel.
- `app/Services/Audit/AuditLogger.php` — dedicated audit-trail writer that persists structured audit events to the `audit_logs` database table instead of the log stream.
- `app/Jobs/*.php` — background jobs use `logger()->error(...)` with contextual arrays for failures.
- `app/Console/Commands/*.php` — CLI commands emit progress/status via `$this->info(...)` / `$this->error(...)` (console output, not file logs).

## Architecture and conventions

### Channel stack strategy
The default channel is a `stack` whose member channels are driven by `LOG_STACK`. In both `.env` and `.env.example` this resolves to `single`, so all application logs flow through the `single` driver into `storage/logs/laravel.log`. The configuration also defines ready-to-use alternative sinks:
- `daily` — rotating file logs with `LOG_DAILY_DAYS` retention.
- `slack` — critical-level alerts to a Slack webhook.
- `papertrail` — UDP syslog via `SyslogUdpHandler` with `PsrLogMessageProcessor`.
- `stderr` — stream handler writing to `php://stderr` with PSR message processing.
- `syslog`, `errorlog`, `null`, `emergency` — standard Laravel channels.

Deprecation warnings are explicitly silenced (`LOG_DEPRECATIONS_CHANNEL=null`).

### Log levels
All channels read their minimum level from `LOG_LEVEL` (default `debug`). The `slack` channel defaults to `critical`, indicating it is intended only for severe incidents. No per-module or per-channel overrides exist in the codebase; level selection is purely environment-driven.

### Structured fields
Structured context is passed as associative arrays to `logger()->error('message', [$key => $value])` in queued jobs (`GenerateCertificatePdf`, `ImportEnrolmentsFromCsv`, `SendEnrolmentConfirmationEmail`). The `papertrail` and `stderr` channels include `PsrLogMessageProcessor`, which normalizes placeholder interpolation — but no custom formatter is configured, so output format follows Monolog's default line format.

### Audit trail separation
Operational/debug logging goes to the Monolog stack. **Audit events** (sensitive mutations such as enrolment status changes, grade changes, role changes) are deliberately written to the database via `App\Services\Audit\AuditLogger::log($action, $entityType, $entityId, $actorId, $meta)`, which inserts rows into the `audit_logs` table. This separation is documented in the class docblock and enforced by the `final` keyword on the service, making it the single write path for audit records.

### Console vs file logging
Console commands use Laravel's console helpers (`$this->info`, `$this->error`) which write to stdout/stderr — they do not go through the Monolog stack. File-based logging is reserved for HTTP requests, queued jobs, and background processes.

## Conventions and constraints

- **Single entry point for audit writes**: Every sensitive mutation must call `AuditLogger::log(...)`. The class comment states this is required per project rules, and the class is declared `final` to prevent subclassing.
- **Channel selection via env only**: No code switches channels at runtime; `LOG_CHANNEL` / `LOG_STACK` control routing entirely.
- **Deprecations disabled**: `LOG_DEPRECATIONS_CHANNEL=null` silences deprecation logs across the app.
- **No custom formatter or processor**: Except for the preconfigured `PsrLogMessageProcessor` on `papertrail` and `stderr`, the app does not define additional processors or formatters.
- **File sink location**: The `single` and `daily` channels both target `storage_path('logs/laravel.log')`; rotation is controlled by `LOG_DAILY_DAYS` when using the `daily` driver.
- **Structured context pattern**: When logging errors in jobs, the message string is kept short and all diagnostic data is passed as an associative array context argument rather than interpolated into the message.