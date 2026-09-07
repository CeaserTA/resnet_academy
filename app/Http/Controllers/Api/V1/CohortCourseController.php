<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\AttachCourseToCohortRequest;
use App\Http\Requests\Api\V1\UpdateCohortCourseRequest;
use App\Http\Resources\CohortCourseResource;
use App\Models\Cohort;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\User;
use App\Services\Enrolment\CohortCourseService;
use App\Services\Enrolment\CohortService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class CohortCourseController extends Controller
{
    public function __construct(
        private readonly CohortService $cohortService,
        private readonly CohortCourseService $cohortCourseService,
    ) {}

    /**
     * List every cohort offering of a course — powers the course-detail "offered in these
     * cohorts" panel.
     *
     * Public (unauthenticated) callers get a student-safe subset — dates/capacity/instructor
     * name/status/is_full/is_accepting_applications. Admin/instructor callers also get
     * waitlisted_count and applications_pending_count.
     */
    public function forCourse(Course $course): AnonymousResourceCollection
    {
        $user = auth()->user();
        $isPrivileged = $user !== null && $this->canViewAnalytics($user, $course);

        $query = $course->cohortCourses()->with(['cohort', 'primaryInstructor'])->latest('id');

        if ($isPrivileged) {
            $query->with(['enrolments', 'applications']);
        }

        return CohortCourseResource::collection($query->get());
    }

    private function canViewAnalytics(User $user, Course $course): bool
    {
        return $user->role->value === 'admin'
            || ($user->role->value === 'instructor' && $course->isTaughtBy($user));
    }

    /**
     * Attach a course to a cohort, creating its offering row.
     */
    public function store(AttachCourseToCohortRequest $request, Cohort $cohort): JsonResponse
    {
        $this->authorize('create', CohortCourse::class);

        $cohortCourse = $this->cohortService->attachCourse(
            cohort: $cohort,
            courseId: $request->validated('course_id'),
            data: $request->safe()->except('course_id'),
            actorId: $request->user()->id,
        );

        return (new CohortCourseResource($cohortCourse->load(['course', 'cohort', 'primaryInstructor'])))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Show a single cohort offering with details.
     */
    public function show(CohortCourse $cohortCourse): CohortCourseResource
    {
        $this->authorize('view', $cohortCourse);

        $cohortCourse->load(['course', 'cohort', 'primaryInstructor', 'enrolments', 'applications']);

        return new CohortCourseResource($cohortCourse);
    }

    /**
     * Update a cohort offering.
     */
    public function update(UpdateCohortCourseRequest $request, CohortCourse $cohortCourse): CohortCourseResource
    {
        $this->authorize('update', $cohortCourse);

        $cohortCourse = $this->cohortCourseService->update(
            cohortCourse: $cohortCourse,
            data: $request->validated(),
            actorId: $request->user()->id,
        );

        return new CohortCourseResource($cohortCourse->load(['course', 'cohort', 'primaryInstructor', 'enrolments', 'applications']));
    }

    /**
     * Detach a course from a cohort (only if no enrollments or applications).
     */
    public function destroy(CohortCourse $cohortCourse): Response
    {
        $this->authorize('delete', $cohortCourse);

        $this->cohortService->detachCourse($cohortCourse, $this->user()->id);

        return response()->noContent();
    }

    private function user(): User
    {
        return auth()->user();
    }
}
