<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Enums\OAuthProvider;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\OauthAccount;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirectResponse;

/**
 * Google is a linked, non-primary login method (architecture.md §4) — primary login stays
 * email + password. On callback, an existing user is matched by verified email before a new
 * one is created, to avoid duplicate accounts when someone uses both methods.
 */
final class SocialAuthController extends Controller
{
    public function redirect(): SymfonyRedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    public function callback(): RedirectResponse
    {
        /** @var SocialiteUser $socialiteUser */
        $socialiteUser = Socialite::driver('google')->user();

        $oauthAccount = OauthAccount::query()
            ->where('provider', OAuthProvider::Google)
            ->where('provider_user_id', $socialiteUser->getId())
            ->first();

        // @phpstan-ignore nullsafe.neverNull (false positive: ->first() returns OauthAccount|null on no match)
        $user = $oauthAccount?->user ?? $this->resolveUser($socialiteUser);

        Auth::login($user);

        return redirect()->away(config('app.frontend_url').'/dashboard');
    }

    private function resolveUser(SocialiteUser $socialiteUser): User
    {
        // Wrapped so a failure creating the OauthAccount rolls back a just-created User row too —
        // previously a brand-new Google sign-in could commit the User and then fail on the
        // OauthAccount insert, leaving an orphaned account with no linked login method. The
        // unique constraints on users.email and (provider, provider_user_id) still guard against
        // two concurrent callbacks for the same identity actually duplicating a row.
        return DB::transaction(function () use ($socialiteUser): User {
            $user = User::query()->where('email', $socialiteUser->getEmail())->first();

            if (! $user) {
                $user = User::create([
                    'role' => UserRole::Student,
                    'name' => $socialiteUser->getName() ?? $socialiteUser->getNickname() ?? $socialiteUser->getEmail(),
                    'email' => $socialiteUser->getEmail(),
                    'password_hash' => Str::password(32),
                    'avatar_url' => $socialiteUser->getAvatar(),
                    'email_verified_at' => now(),
                ]);

                event(new Registered($user));
            }

            OauthAccount::create([
                'user_id' => $user->id,
                'provider' => OAuthProvider::Google,
                'provider_user_id' => $socialiteUser->getId(),
            ]);

            return $user;
        });
    }
}
