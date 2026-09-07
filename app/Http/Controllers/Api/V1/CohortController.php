<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreCohortRequest;
use App\Http\Requests\Api\V1\UpdateCohortRequest;
use App\Http\Resources\CohortResource;
use App\Models\Cohort;
use App\Services\Enrolment\CohortService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class CohortController extends Controller
{
    public function __construct(
        private readonly CohortService $cohortService,
    ) {}

    /**
     * Cohort browse — powers /cohorts and the landing page cohort teaser for guests/students
     * (published only, unless a specific ?status= is requested), and the admin cohort
     * management list for admin/instructor callers (every status, so a freshly created draft
     * cohort is visible immediately — matching CourseController::index()'s same role-based
     * visibility split). No authentication required for the published default.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $isPrivileged = $user !== null && in_array($user->role->value, ['admin', 'instructor'], true);

        $cohorts = Cohort::query()
            ->when(
                $request->filled('status'),
                fn ($query) => $query->where('status', $request->string('status')),
                fn ($query) => $isPrivileged ? $query : $query->where('status', 'published'),
            )
            ->withCount('cohortCourses')
            ->with(['cohortCourses.cohort', 'cohortCourses.course.category', 'cohortCourses.course.instructors', 'cohortCourses.primaryInstructor'])
            ->orderBy('start_date')
            ->get();

        return CohortResource::collection($cohorts);
    }

    /**
     * Public cohort detail — every course offered in this cohort with its own seats/CTA.
     */
    public function show(Cohort $cohort): CohortResource
    {
        // cohortCourses.cohort is loaded too (even though it's always this same $cohort) so
        // CohortCourseResource's whenLoaded('cohort') checks resolve — it has no way to know
        // the parent is already in memory.
        $cohort->load(['cohortCourses.cohort', 'cohortCourses.course.category', 'cohortCourses.course.instructors', 'cohortCourses.primaryInstructor']);

        return new CohortResource($cohort);
    }

    public function store(StoreCohortRequest $request): JsonResponse
    {
        $this->authorize('create', Cohort::class);

        $cohort = $this->cohortService->create($request->validated(), $request->user()->id);

        return (new CohortResource($cohort))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateCohortRequest $request, Cohort $cohort): CohortResource
    {
        $this->authorize('update', Cohort::class);

        $cohort = $this->cohortService->update($cohort, $request->validated(), $request->user()->id);

        return new CohortResource($cohort->load(['cohortCourses.cohort', 'cohortCourses.course', 'cohortCourses.primaryInstructor']));
    }

    public function destroy(Request $request, Cohort $cohort): Response
    {
        $this->authorize('delete', Cohort::class);

        $this->cohortService->delete($cohort, $request->user()->id);

        return response()->noContent();
    }
}
