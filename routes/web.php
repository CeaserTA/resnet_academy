<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\AccountController;
use App\Http\Controllers\Auth\SocialAuthController;
use Illuminate\Support\Facades\Route;

Route::view('/', 'welcome');

/*
|--------------------------------------------------------------------------
| Auth routes (session/CSRF, not "api" middleware)
|--------------------------------------------------------------------------
|
| Sanctum's SPA authentication requires login/register/logout to run behind
| the "web" middleware group (session + CSRF) rather than "api" (stateless).
| Prefixed to /api/v1 to keep one consistent URL surface for the React SPA
| even though these routes live in this file, not routes/api.php.
| See architecture.md §4.
|
*/
Route::prefix('api/v1')->group(function (): void {
    require __DIR__.'/auth.php';

    Route::get('/auth/google/redirect', [SocialAuthController::class, 'redirect'])
        ->middleware('guest')
        ->name('auth.google.redirect');

    Route::get('/auth/google/callback', [SocialAuthController::class, 'callback'])
        ->middleware('guest')
        ->name('auth.google.callback');

    // Ends the session the same way logout does, so it has to run behind "web" middleware
    // too (see note above) rather than living in routes/api.php with the rest of AccountController.
    Route::post('/me/request-deactivation', [AccountController::class, 'requestDeactivation'])
        ->middleware('auth');
});
