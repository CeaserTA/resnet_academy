<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\EnrolmentSource;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreEnrolmentRequest;
use App\Http\Resources\EnrolmentResource;
use App\Models\Course;
use App\Models\Enrolment;
use App\Services\Enrolment\EnrolmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

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
            ->with(['course.category', 'order.paymentSubmissions'])
            ->orderBy('applied_at', 'desc')
            ->paginate(15);

        return EnrolmentResource::collection($enrolments);
    }

    /**
     * FR-2/FR-3: self-enrolment, auto-confirmed, no eligibility gate.
     */
    public function store(StoreEnrolmentRequest $request): JsonResponse
    {
        $course = Course::query()->findOrFail($request->validated('course_id'));

        $enrolment = $this->enrolmentService->enrol($request->user(), $course, EnrolmentSource::Self);

        return (new EnrolmentResource($enrolment->load(['course.category', 'order.paymentSubmissions'])))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * A student dropping their own course, or an admin withdrawing them — the only enrolment
     * status transition that exists post-creation (architecture.md §7 audit requirement).
     */
    public function withdraw(Request $request, Enrolment $enrolment): EnrolmentResource
    {
        $this->authorize('withdraw', $enrolment);

        $enrolment = $this->enrolmentService->withdraw($enrolment, $request->user());

        return new EnrolmentResource($enrolment->load(['course.category', 'order.paymentSubmissions']));
    }
}
