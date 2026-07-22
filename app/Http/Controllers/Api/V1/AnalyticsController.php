<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Services\Analytics\AnalyticsService;
use Illuminate\Http\JsonResponse;

final class AnalyticsController extends Controller
{
    public function __construct(private readonly AnalyticsService $analyticsService) {}

    public function courseAnalytics(Course $course): JsonResponse
    {
        $this->authorize('viewAnalytics', $course);

        return response()->json(['data' => $this->analyticsService->courseAnalytics($course)]);
    }
}
