<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Services\Profile\ProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * ProfileController provides API endpoints for profile completion management.
 * Exposes profile status (completion percentage, missing fields) and update functionality
 * to support the Progressive Student Profile Completion feature.
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 4.5
 */
final class ProfileController extends Controller
{
    public function __construct(
        private readonly ProfileService $profileService,
    ) {}

    /**
     * GET /api/v1/profile/status
     *
     * Returns profile completion status for the authenticated user.
     * Includes completion percentage, missing required fields, and completed fields.
     *
     * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function status(Request $request): JsonResponse
    {
        return response()->json(
            $this->profileService->getProfileStatus($request->user())
        );
    }

    /**
     * PUT /api/v1/profile
     *
     * Update profile fields for the authenticated user.
     * Uses UpdateProfileRequest for validation of all profile fields including
     * phone, country, city, and highest_qualification.
     *
     * Validates: Requirements 4.5, 9.4
     *
     * @param UpdateProfileRequest $request
     * @return UserResource
     */
    public function update(UpdateProfileRequest $request): UserResource
    {
        $user = $request->user();
        $data = $request->validated();

        // Recompute 'name' from first_name/last_name if provided
        $lastName = $data['last_name'] ?? $user->last_name ?? '';
        if (isset($data['first_name'])) {
            $data['name'] = trim($data['first_name'].' '.$lastName);
        }

        $user->update($data);

        return new UserResource($user->fresh());
    }
}
