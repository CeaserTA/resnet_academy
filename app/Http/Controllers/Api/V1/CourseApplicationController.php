<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\RejectCourseApplicationRequest;
use App\Http\Requests\Api\V1\StoreCourseApplicationRequest;
use App\Http\Resources\CourseApplicationResource;
use App\Models\Course;
use App\Models\CourseApplication;
use App\Services\Enrolment\CourseApplicationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class CourseApplicationController extends Controller
{
    public function __construct(private readonly CourseApplicationService $courseApplicationService) {}

    /**
     * Review queue — every application, optionally filtered by status. An instructor sees only
     * applications for courses they teach; an admin sees everything.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', CourseApplication::class);

        $applications = CourseApplication::query()
            ->with(['student', 'course.category', 'course.instructors', 'reviewer'])
            ->when(
                $request->user()->role === UserRole::Instructor,
                fn ($query) => $query->whereHas('course.instructors', fn ($q) => $q->where('users.id', $request->user()->id)),
            )
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        // One query for the recommended courses of the whole page instead of one per row.
        CourseApplication::loadRecommendedCourses($applications->getCollection());

        return CourseApplicationResource::collection($applications);
    }

    /**
     * The authenticated student's own applications — drives the "Applications" dashboard section.
     * Filtering (expiry, dismissal, acted-on recommendations) happens in the service; this stays
     * a plain pass-through.
     */
    public function mine(Request $request): AnonymousResourceCollection
    {
        $applications = $this->courseApplicationService->visibleForDashboard($request->user());

        return CourseApplicationResource::collection($applications);
    }

    public function store(StoreCourseApplicationRequest $request): JsonResponse
    {
        $course = Course::query()->findOrFail($request->validated('course_id'));

        $application = $this->courseApplicationService->apply(
            student: $request->user(),
            course: $course,
            answers: $request->validated('answers', []),
            portfolioUrl: $request->validated('portfolio_url'),
            alternativeProofText: $request->validated('alternative_proof_text'),
            sectionId: $request->validated('section_id'),
        );

        return (new CourseApplicationResource($application->load(['student', 'course', 'section'])))
            ->response()
            ->setStatusCode(201);
    }

    public function approve(Request $request, CourseApplication $application): CourseApplicationResource
    {
        $this->authorize('approve', $application);

        // The service re-fetches the application under a row lock inside its transaction, so
        // the policy check here runs against the route-bound model while the decision itself
        // is race-safe.
        $application = $this->courseApplicationService->approve($application->id, $request->user());

        return new CourseApplicationResource($application->load(['student', 'course', 'reviewer']));
    }

    public function reject(RejectCourseApplicationRequest $request, CourseApplication $application): CourseApplicationResource
    {
        $application = $this->courseApplicationService->reject(
            $application,
            $request->user(),
            $request->validated('recommended_course_ids', []),
            $request->validated('rejection_reason'),
        );

        return new CourseApplicationResource($application->load(['student', 'course', 'reviewer']));
    }

    public function dismiss(Request $request, CourseApplication $application): CourseApplicationResource
    {
        $this->authorize('dismiss', $application);

        $application = $this->courseApplicationService->dismiss($application, $request->user());

        return new CourseApplicationResource($application->load(['student', 'course', 'reviewer']));
    }
}
