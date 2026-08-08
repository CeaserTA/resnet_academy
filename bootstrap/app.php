<?php

declare(strict_types=1);

use App\Http\Middleware\EnsureEmailIsVerified;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            EnsureFrontendRequestsAreStateful::class,
        ]);

        $middleware->alias([
            'verified' => EnsureEmailIsVerified::class,
            'profile.complete' => \App\Http\Middleware\EnsureProfileComplete::class,
        ]);

        // The 'login' named route is a POST-only JSON endpoint (this is an API-only backend —
        // there's no server-rendered login page), so Laravel's own default guest-redirect
        // target (route('login')) 405s. Only non-JSON requests hit this path (JSON requests
        // are handled by the AuthenticationException render callback below) — those are plain
        // browser navigations, e.g. clicking the "verify email" link straight from an email
        // client, so send them to the actual login page on the frontend SPA instead.
        $middleware->redirectGuestsTo(fn () => config('app.frontend_url').'/login');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // architecture.md §4: consistent JSON error shape for every JSON-expecting request,
        // so the React client can handle errors generically instead of per-exception-type.
        $renderApiError = function (Throwable $e, Request $request, int $status, string $code, ?array $fields = null) {
            if (! $request->expectsJson()) {
                return null;
            }

            return response()->json([
                'error' => [
                    'code' => $code,
                    'message' => $e->getMessage() ?: $code,
                    'fields' => $fields,
                ],
            ], $status);
        };

        $exceptions->render(function (ValidationException $e, Request $request) use ($renderApiError) {
            return $renderApiError($e, $request, $e->status, 'validation_failed', $e->errors());
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) use ($renderApiError) {
            return $renderApiError($e, $request, 401, 'unauthenticated');
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) use ($renderApiError) {
            return $renderApiError($e, $request, 403, 'forbidden');
        });

        $exceptions->render(function (ModelNotFoundException $e, Request $request) use ($renderApiError) {
            return $renderApiError($e, $request, 404, 'not_found');
        });

        $exceptions->render(function (HttpExceptionInterface $e, Request $request) use ($renderApiError) {
            return $renderApiError($e, $request, $e->getStatusCode(), 'http_error');
        });
    })->create();
