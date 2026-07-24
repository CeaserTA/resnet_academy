<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Services\Analytics\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AnalyticsController extends Controller
{
    public function __construct(private readonly AnalyticsService $analyticsService) {}

    public function courseAnalytics(Course $course): JsonResponse
    {
        $this->authorize('viewAnalytics', $course);

        return response()->json(['data' => $this->analyticsService->courseAnalytics($course)]);
    }

    /**
     * "Send Mass Notice" — same viewAnalytics gate as the dashboard itself (admin or the
     * course's teaching instructor).
     */
    public function notifyAtRisk(Request $request, Course $course): JsonResponse
    {
        $this->authorize('viewAnalytics', $course);

        $message = $request->validate(['message' => ['nullable', 'string', 'max:500']])['message'] ?? null;

        $notified = $this->analyticsService->notifyAtRiskStudents($course, $message);

        return response()->json(['data' => ['notified' => $notified]]);
    }
}
