<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\GradeSubmissionRequest;
use App\Http\Requests\Api\V1\StoreSubmissionRequest;
use App\Http\Resources\AssignmentSubmissionResource;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Services\Assessment\AssignmentSubmissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class AssignmentSubmissionController extends Controller
{
    public function __construct(private readonly AssignmentSubmissionService $submissionService) {}

    /**
     * Instructor/admin: every submission for this assignment. Student: only their own.
     */
    public function index(Request $request, Assignment $assignment): AnonymousResourceCollection
    {
        $this->authorize('grade', $assignment);

        $submissions = $assignment->submissions()->with(['student', 'rubricScores'])->latest('submitted_at')->paginate(20);

        return AssignmentSubmissionResource::collection($submissions);
    }

    public function store(StoreSubmissionRequest $request, Assignment $assignment): JsonResponse
    {
        $submission = $this->submissionService->submit($request->user(), $assignment, $request->validated());

        return (new AssignmentSubmissionResource($submission))->response()->setStatusCode(201);
    }

    public function grade(GradeSubmissionRequest $request, AssignmentSubmission $submission): AssignmentSubmissionResource
    {
        $graded = $this->submissionService->grade($request->user(), $submission, $request->validated());

        return new AssignmentSubmissionResource($graded->load('rubricScores'));
    }
}
