---
kind: external_dependency
name: Laravel 12 Framework (PHP)
slug: laravel
category: external_dependency
category_hints:
    - framework_behavior
scope:
    - '**'
---

The project is a Laravel 12 application using the standard MVC layout under `app/` with Eloquent models in `app/Models`, migrations in `database/migrations`, API controllers under `app/Http/Controllers`, and service classes in `app/Services`. Authentication uses Laravel's built-in session guard (`config/auth.php`) plus Sanctum for API tokens (`laravel/sanctum`). Social login is wired through `laravel/socialite` with Google configured in `config/services.php`. The framework drives routing via `routes/api.php`, `routes/web.php`, and `routes/auth.php`, and queues are managed by Laravel's queue worker invoked from the dev script.