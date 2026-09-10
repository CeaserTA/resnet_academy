<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\CourseEnrolmentPolicy;
use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Exceptions\EnrolmentAlreadyHasPendingTransferException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreEnrolmentRequest;
use App\Http\Resources\EnrolmentResource;
use App\Models\Course;
use App\Models\Enrolment;
use App\Services\Enrolment\EnrolmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

final class EnrolmentController extends Controller
{
    public function __construct(private readonly EnrolmentService $enrolmentService) {}

    /**
     * The authenticated student's own enrolments (FR-13 progress dashboard reads from this).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $enrolments = Enrolment::query()
            ->where('student_id', $request->user()->id)
            ->with(['course.category', 'order.paymentSubmissions', 'cohortCourse.cohort'])
            ->orderBy('applied_at', 'desc')
            ->paginate(15);

        return EnrolmentResource::collection($enrolments);
    }

    /**
     * FR-2/FR-3: self-enrolment, auto-confirmed, no eligibility gate — except Application-policy
     * courses, which must go through `CourseApplicationController::store()` and admin review
     * instead. Advisory and Open courses both still self-enrol here directly.
     */
    public function store(StoreEnrolmentRequest $request): JsonResponse
    {
        $course = Course::query()->findOrFail($request->validated('course_id'));

        if ($course->enrolment_policy === CourseEnrolmentPolicy::Application) {
            throw ValidationException::withMessages(['course_id' => 'This course requires an application — you can’t enrol directly.']);
        }

        // Mirrors CourseApplicationService::apply()'s existing-enrolment guard — without this,
        // a duplicate self-enrol attempt (e.g. a double click) falls through to the DB's unique
        // constraint on (student_id, cohort_course_id) as an unhandled 500 instead of a clean
        // validation error.
        $alreadyActive = Enrolment::query()
            ->where('student_id', $request->user()->id)
            ->where('cohort_course_id', $request->validated('cohort_course_id'))
            ->whereIn('status', [EnrolmentStatus::Confirmed, EnrolmentStatus::Waitlisted, EnrolmentStatus::TransferRequested])
            ->exists();

        if ($alreadyActive) {
            throw ValidationException::withMessages(['cohort_course_id' => 'You are already enrolled in this course/cohort.']);
        }

        $enrolment = $this->enrolmentService->enrol(
            $request->user(),
            $course,
            EnrolmentSource::Self,
            $request->validated('cohort_course_id')
        );

        return (new EnrolmentResource($enrolment->load(['course.category', 'order.paymentSubmissions', 'cohortCourse.cohort'])))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * A student dropping their own course, or an admin withdrawing them — the only enrolment
     * status transition that exists post-creation (architecture.md §7 audit requirement).
     */
    public function withdraw(Request $request, Enrolment $enrolment): EnrolmentResource|JsonResponse
    {
        $this->authorize('withdraw', $enrolment);

        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $enrolment = $this->enrolmentService->withdraw(
                $enrolment,
                $request->user(),
                $validated['note'] ?? null
            );

            return new EnrolmentResource($enrolment->load(['course.category', 'order.paymentSubmissions']));
        } catch (EnrolmentAlreadyHasPendingTransferException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }
    }

    /**
     * Cancel a pending transfer request, reverting to Confirmed status.
     */
    public function cancelTransferRequest(Request $request, Enrolment $enrolment): EnrolmentResource
    {
        $this->authorize('cancelTransferRequest', $enrolment);

        $enrolment = $this->enrolmentService->cancelTransferRequest($enrolment, $request->user());

        return new EnrolmentResource($enrolment->load(['course.category', 'order.paymentSubmissions']));
    }
}
