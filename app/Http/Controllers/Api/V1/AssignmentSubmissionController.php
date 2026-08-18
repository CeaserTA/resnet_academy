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
use App\Services\Storage\MediaStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class AssignmentSubmissionController extends Controller
{
    public function __construct(
        private readonly AssignmentSubmissionService $submissionService,
        private readonly MediaStorageService $mediaStorage,
    ) {}

    /**
     * Instructor/admin: every submission for this assignment (gated by grade policy).
     * Student: only their own submissions, no policy gate needed — they own the data.
     */
    public function index(Request $request, Assignment $assignment): AnonymousResourceCollection
    {
        $user = $request->user();

        if ($user->role->value === 'student') {
            $submissions = $assignment->submissions()
                ->where('student_id', $user->id)
                ->with(['student', 'rubricScores'])
                ->latest('submitted_at')
                ->paginate(20);
        } else {
            $this->authorize('grade', $assignment);

            $submissions = $assignment->submissions()
                ->with(['student', 'rubricScores'])
                ->latest('submitted_at')
                ->paginate(20);
        }

        return AssignmentSubmissionResource::collection($submissions);
    }

    public function store(StoreSubmissionRequest $request, Assignment $assignment): JsonResponse
    {
        $data = $request->validated();
        unset($data['file']);

        if ($request->hasFile('file')) {
            $data['file_url'] = $this->mediaStorage->store($request->file('file'), "submissions/{$assignment->id}");
        }

        $submission = $this->submissionService->submit($request->user(), $assignment, $data);

        return (new AssignmentSubmissionResource($submission))->response()->setStatusCode(201);
    }

    public function grade(GradeSubmissionRequest $request, AssignmentSubmission $submission): AssignmentSubmissionResource
    {
        $graded = $this->submissionService->grade($request->user(), $submission, $request->validated());

        return new AssignmentSubmissionResource($graded->load('rubricScores'));
    }
}
