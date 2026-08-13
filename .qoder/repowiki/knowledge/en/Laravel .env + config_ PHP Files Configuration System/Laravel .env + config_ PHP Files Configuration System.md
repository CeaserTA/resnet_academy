---
kind: configuration_system
name: Laravel .env + config/ PHP Files Configuration System
category: configuration_system
scope:
    - '**'
source_files:
    - .env.example
    - config/app.php
    - config/database.php
    - config/filesystems.php
    - config/logging.php
    - config/mail.php
    - config/queue.php
    - config/session.php
    - config/sanctum.php
    - config/cors.php
    - config/services.php
    - config/cache.php
    - config/auth.php
    - bootstrap/providers.php
---

## Overview

The application uses the standard Laravel configuration system: per-environment `.env` files for secrets and runtime overrides, and PHP array-based files under `config/` as the canonical source of truth. The bootstrap layer (`bootstrap/app.php`, `bootstrap/providers.php`) loads these files at framework startup. There is no custom configuration loader — all values are resolved via Laravel's `env()` helper (for environment variables) and `config()` accessor (for merged config arrays).

## Key Files

- **`.env.example`** — master template listing every supported environment variable (89 keys), including app identity, database, cache, queue, session, mail, AWS/R2 object storage, Bunny Stream video CDN, Resend email, Google OAuth, and a `VITE_APP_NAME` bridge to the React frontend.
- **`config/app.php`** — application name, env/debug/url, timezone (`UTC`), locale/faker locales, encryption key/cipher, maintenance driver/store, and a project-specific `frontend_url` used to redirect back to the SPA after auth flows that cannot return JSON.
- **`config/database.php`** — default connection (`sqlite` when no DB env is set, otherwise MySQL/MariaDB/PgSQL/SQLSRV from `DB_CONNECTION`); Redis connections for both default and cache namespaces with retry/backoff settings; migration repository table.
- **`config/filesystems.php`** — default disk (`local`), public disk rooted at `storage_path('app/public')` with URL derived from `APP_URL/storage`, S3 disk for AWS, and a dedicated `r2` S3-compatible disk for Cloudflare R2 (object storage for profile images, course thumbnails, resource files, forum attachments, payment receipts, certificate PDFs). Symbolic link `public/storage -> storage/app/public` is configured.
- **`config/logging.php`** — default channel `stack` composed from comma-separated channels in `LOG_STACK`; built-in single/daily/slack/papertrail/stderr/syslog/errorlog/null channels; deprecations routed to a separate channel.
- **`config/mail.php`** — default mailer `log` (development); transports for smtp/ses/postmark/resend/sendmail/log/array; failover and roundrobin strategies; global `from` address/name sourced from `MAIL_*` / `APP_NAME`.
- **`config/queue.php`** — default backend `database` with `jobs` table; additional drivers sync/beanstalkd/sqs/redis/background; job batching stored in `job_batches`; failed jobs use `database-uuids` by default.
- **`config/session.php`** — default driver `database`, lifetime 120 minutes, encrypted sessions optional, cookie name derived from `APP_NAME`, path `/`, domain configurable, SameSite `lax`, partitioned cookies supported.
- **`config/sanctum.php`** — stateful domains auto-populated from `SANCTUM_STATEFUL_DOMAINS` plus `FRONTEND_URL` host; guard set to `web`; token expiration disabled (uses model `expires_at`); token prefix configurable to avoid secret-scanner false positives.
- **`config/cors.php`** — wildcard paths/methods allowed; origins include `FRONTEND_URL` plus hardcoded localhost dev ports; credentials enabled for SPA cookie auth.
- **`config/services.php`** — third-party service credential map: Postmark, Resend, SES, Slack notifications, Google OAuth (client_id/secret/redirect).
- **`config/cache.php`, `config/auth.php`, `config/scramble.php`** — framework defaults for caching, authentication guards/providers, and API documentation generation.
- **`bootstrap/providers.php`** — registers only `App\Providers\AppServiceProvider`; no other bootstrapping providers.

## Architecture & Conventions

1. **Two-layer config**: `config/*.php` files define the schema and defaults; `.env` overrides supply environment-specific values via `env('KEY', default)`. No code reads `.env` directly — it goes through `env()`.
2. **Environment-driven backends**: Database, cache, queue, session, filesystem, logging, and mail all switch behavior purely by changing an env var (e.g. `QUEUE_CONNECTION=database|redis|sqs`, `FILESYSTEM_DISK=local|r2|s3`, `SESSION_DRIVER=database|file|redis`).
3. **Service abstraction over secrets**: Third-party integrations (AWS, R2, Bunny Stream, Resend, Google OAuth) are exposed as named entries in `config/services.php` or dedicated config files, never inline in business code.
4. **Frontend-backend bridge**: `VITE_APP_NAME="${APP_NAME}"` in `.env.example` injects the Laravel app name into the React build via Vite's env loading, keeping branding consistent across both sides.
5. **SPA cross-origin setup**: `FRONTEND_URL` drives both CORS allowed origins and Sanctum stateful domains, centralizing SPA origin management in one env var.
6. **Object storage strategy**: Media files go to R2 (configured as an `s3`-compatible disk with `region=auto` and `use_path_style_endpoint=true`); videos are hosted separately on Bunny Stream and never touch the filesystem disks.
7. **Default-to-local development**: Without any `.env`, SQLite is used for the database, `log` mailer writes to the log channel, `database` queue uses the `jobs` table, and local filesystem disks store everything under `storage/`.

## Conventions & Constraints

- Every configurable value has a corresponding `env('...')` call with a documented default in its `config/` file; adding a new setting requires updating both the config file and `.env.example`.
- Secrets (API keys, passwords, tokens) live exclusively in `.env` (or the host environment); they must not be committed — `.env` is gitignored and `.env.example` contains only placeholders.
- Environment variables follow Laravel naming conventions: `DB_*`, `REDIS_*`, `MAIL_*`, `SESSION_*`, `QUEUE_*`, `CACHE_*`, `LOG_*`, `AWS_*`, `R2_*`, `BUNNY_STREAM_*`, `RESEND_*`, `GOOGLE_*`, `SANCTUM_*`.
- The `APP_PREVIOUS_KEYS` env var supports key rotation by accepting a comma-separated list of prior encryption keys.
- Maintenance mode driver/store is controlled via `APP_MAINTENANCE_DRIVER` and `APP_MAINTENANCE_STORE` (defaulting to `file`/`database`).
- Logging level and stack composition are fully runtime-configurable via `LOG_LEVEL` and `LOG_STACK` without touching code.
- Session cookies are named using `Str::slug(APP_NAME)-session`, so changing `APP_NAME` invalidates existing sessions by design.