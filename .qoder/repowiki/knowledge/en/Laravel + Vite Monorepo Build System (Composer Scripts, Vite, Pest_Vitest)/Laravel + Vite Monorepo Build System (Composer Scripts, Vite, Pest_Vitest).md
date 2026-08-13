---
kind: build_system
name: Laravel + Vite Monorepo Build System (Composer Scripts, Vite, Pest/Vitest)
category: build_system
scope:
    - '**'
source_files:
    - composer.json
    - frontend/package.json
    - frontend/vite.config.ts
    - phpunit.xml
    - phpstan.neon
    - artisan
---

## What system/approach is used

This repository is a Laravel + React monorepo with two independent build pipelines wired together through Composer scripts:

- **Backend**: PHP 8.2+ application built via Composer (`composer.json`). The project uses the standard Laravel framework (^12) with Breeze scaffolding, Sanctum for API auth, and Pest/PHPUnit for testing.
- **Frontend**: A separate `frontend/` directory containing a TypeScript React SPA built with Vite (^8), Vitest for unit tests, and Playwright for E2E tests.
- **No containerization or CI**: There is no `Dockerfile`, `docker-compose.yml`, or `.github/workflows/` — the production readiness document explicitly calls this out as incomplete.

## Key files and packages

- `composer.json` — Backend dependency manifest, PSR-4 autoload rules (`App\`, `Database\Factories\`, `Database\Seeders\`, `Tests\`), and all Composer scripts that orchestrate setup, dev, and test runs.
- `frontend/package.json` — Frontend dependencies (React 19, Tailwind v4, Radix UI, TipTap, TanStack Query, Axios) and npm scripts for dev/build/lint/test/e2e.
- `frontend/vite.config.ts` — Vite config: React + Tailwind plugins, `@` alias to `src/`, dev server on `127.0.0.1:3000`, Vitest config with `jsdom` environment and a forked pool with an elevated `execTimeout` (120s) for Windows worker startup.
- `phpunit.xml` — PHPUnit/Pest bootstrap, Unit + Feature test suites under `tests/Unit` and `tests/Feature`, source coverage over `app/`, and test-time env overrides (MySQL DB `resnet_academy_testing`, array cache/session/mail, sync queue).
- `phpstan.neon` — Static analysis configuration (present in repo root).
- `artisan` — Laravel CLI entry point invoked by Composer scripts.

## Architecture and conventions

### Composer scripts (single entry point)
- `composer setup` — Full bootstrap: installs PHP deps, copies `.env.example` → `.env`, generates app key, runs migrations, then `npm install` + `npm run build` (builds frontend assets into Laravel's public path).
- `composer dev` — Concurrent development loop using `concurrently`: starts `php artisan serve`, `php artisan queue:listen --tries=1 --timeout=0`, `php artisan pail --timeout=0` (logs), and `npm run dev` (Vite HMR). Processes are named `server`, `queue`, `logs`, `vite` and killed together on exit.
- `composer test` — Clears config then runs `php artisan test` (Pest/PHPUnit).
- Post-install hooks: `post-autoload-dump` discovers packages; `post-update-cmd` publishes Laravel assets; `post-root-package-install` creates `.env`; `post-create-project-cmd` generates key, touches SQLite DB, and runs migrations gracefully.

### Frontend build pipeline
- `npm run build` first runs `tsc -b` (TypeScript project references build) then `vite build`, producing optimized static assets.
- `npm run dev` runs Vite dev server on port 3000 with HMR.
- Tests: `npm run test` / `test:watch` use Vitest with jsdom; `npm run test:e2e*` use Playwright.
- Linting/formatting: `eslint .` and `prettier --write .`.

### Testing pipeline
- Backend tests live under `tests/Feature` (HTTP/service integration) and `tests/Unit` (models, services, middleware, request validation). Pest is the primary runner, configured via `tests/Pest.php` and `tests/TestCase.php`.
- Frontend unit tests use Vitest with a shared setup file at `frontend/src/test/setup.ts`.
- E2E tests use Playwright (`frontend/playwright.config.ts`, specs under `frontend/e2e/`).

### Asset bundling convention
The Composer `setup` script builds the frontend once (`npm run build`) so that Vite output lands in Laravel's public directory and can be served by the web server alongside Blade views. During development, Vite runs separately on port 3000 while the Laravel server serves the API and Blade pages.

## Conventions and constraints

- **PHP version lock**: `php ^8.2` is enforced by Composer; all tooling (Laravel 12, Pest 8, Larastan 3) targets this minimum.
- **Autoload layout**: PSR-4 maps `App\` → `app/`, `Database\Factories\` → `database/factories/`, `Database\Seeders\` → `database/seeders/`, `Tests\` → `tests/`. Adding new code outside these roots requires updating autoload mappings.
- **Test database**: Tests always target a dedicated MySQL database named `resnet_academy_testing` (overridden in `phpunit.xml`); migrations must be idempotent against it.
- **Queue/mail/cache during tests**: Forced to `sync`, `array`, and `null` respectively so tests run without external services.
- **Frontend module resolution**: The `@` alias points to `frontend/src/`, so imports like `@/components/...` resolve relative to the `src/` folder.
- **Windows-friendly Vitest**: Fork pool with `execTimeout: 120_000` is required because worker startup on Windows can exceed the default 60s timeout.
- **No Docker/CI yet**: The `PRODUCTION_READINESS.md` document explicitly states there is no `Dockerfile`, `docker-compose.yml`, or GitHub Actions workflow — deployment is currently manual or unconfigured.