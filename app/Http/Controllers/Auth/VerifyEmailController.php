<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\RedirectResponse;

final class VerifyEmailController extends Controller
{
    /**
     * Mark the authenticated user's email address as verified.
     */
    public function __invoke(EmailVerificationRequest $request): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user instanceof User, 403);

        if (! $user->hasVerifiedEmail() && $user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        // Always the same destination — there's no legitimate "intended" URL to honor here
        // (this link is opened straight from an email client, not a redirected-from page), and
        // `redirect()->intended()` would otherwise fall back to any stale `url.intended` value
        // left in the session by an unrelated earlier request.
        return redirect(config('app.frontend_url').'/dashboard?verified=1');
    }
}
