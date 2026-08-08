<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\Profile\ProfileService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware that enforces profile completion requirements.
 * 
 * Blocks requests to protected routes when the authenticated user's profile is incomplete,
 * returning a 403 error with detailed missing field information. Used to protect course
 * application endpoints and other features requiring complete user profiles.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.6
 */
final class EnsureProfileComplete
{
    /**
     * Create a new middleware instance.
     *
     * @param ProfileService $profileService Injected service for profile completeness checks
     */
    public function __construct(
        private readonly ProfileService $profileService
    ) {
    }

    /**
     * Handle an incoming request.
     *
     * Validates: Requirements 12.2, 12.3, 12.4, 12.6
     *
     * @param  Request  $request
     * @param  Closure(Request): (Response)  $next
     * @return Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$this->profileService->isProfileComplete($user)) {
            return response()->json([
                'error' => [
                    'code' => 'profile_incomplete',
                    'message' => 'Please complete your profile before applying for this course.',
                    'missing_fields' => $this->profileService->getMissingFields($user),
                ],
            ], 403);
        }

        return $next($request);
    }
}

