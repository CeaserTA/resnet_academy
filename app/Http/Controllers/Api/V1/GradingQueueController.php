<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Services\Assessment\GradingQueueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Staff "To grade" list — see GradingQueueService. Students get 403.
 */
final class GradingQueueController extends Controller
{
    public function __construct(private readonly GradingQueueService $gradingQueue) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless(in_array($user->role, [UserRole::Admin, UserRole::Instructor], true), 403);

        $validated = $request->validate(['course_id' => ['nullable', 'integer']]);

        return response()->json([
            'data' => $this->gradingQueue->forUser($user, isset($validated['course_id']) ? (int) $validated['course_id'] : null),
        ]);
    }
}
