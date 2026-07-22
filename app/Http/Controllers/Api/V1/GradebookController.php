<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Services\Assessment\GradebookService;
use Illuminate\Http\JsonResponse;

final class GradebookController extends Controller
{
    public function __construct(private readonly GradebookService $gradebookService) {}

    public function show(Course $course): JsonResponse
    {
        $this->authorize('viewGradebook', $course);

        return response()->json(['data' => $this->gradebookService->forCourse($course)]);
    }
}
