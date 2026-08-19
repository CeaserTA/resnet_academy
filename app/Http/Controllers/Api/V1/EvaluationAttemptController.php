<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\GradeEvaluationAttemptRequest;
use App\Http\Requests\Api\V1\SubmitEvaluationAttemptRequest;
use App\Http\Resources\AttemptQuestionResource;
use App\Http\Resources\EvaluationAttemptResource;
use App\Models\Evaluation;
use App\Models\EvaluationAttempt;
use App\Services\Assessment\EvaluationAttemptService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class EvaluationAttemptController extends Controller
{
    public function __construct(private readonly EvaluationAttemptService $attemptService) {}

    /**
     * Instructor/admin: every attempt on this evaluation, most recent first ΓÇö the grading
     * queue for manual (short-answer/essay) scoring pulls from here.
     */
    public function index(Evaluation $evaluation): AnonymousResourceCollection
    {
        $this->authorize('grade', $evaluation);

        $attempts = $evaluation->attempts()->with(['student', 'answers'])->latest('submitted_at')->paginate(20);

        return EvaluationAttemptResource::collection($attempts);
    }

    /**
     * Starts (or resumes an in-progress) attempt and returns its questions in the
     * answer-key-free shape (AttemptQuestionResource) ΓÇö never the bank's admin view.
     */
    public function start(Request $request, Evaluation $evaluation): JsonResponse
    {
        $this->authorize('attempt', $evaluation);

        $attempt = $this->attemptService->start($request->user(), $evaluation);
        $questions = $this->attemptService->questionsFor($attempt);

        return response()->json([
            'data' => [
                'attempt' => (new EvaluationAttemptResource($attempt))->resolve($request),
                'questions' => AttemptQuestionResource::collection($questions)->resolve($request),
                // Safe summary only ΓÇö no questions/answer key here, those are gated to
                // instructors/admins via EvaluationPolicy::view (EvaluationController::show).
                'evaluation' => [
                    'id' => $evaluation->id,
                    'title' => $evaluation->title,
                    'pass_score' => $evaluation->pass_score,
                    'time_limit_minutes' => $evaluation->time_limit_minutes,
                ],
            ],
        ], 201);
    }

    public function show(Request $request, EvaluationAttempt $attempt): EvaluationAttemptResource
    {
        $this->authorize('view', $attempt);

        return new EvaluationAttemptResource($attempt->load('answers'));
    }

    public function submit(SubmitEvaluationAttemptRequest $request, EvaluationAttempt $attempt): EvaluationAttemptResource
    {
        $attempt = $this->attemptService->submit($attempt, $request->validated('answers'));

        return new EvaluationAttemptResource($attempt->load('answers'));
    }

    public function grade(GradeEvaluationAttemptRequest $request, EvaluationAttempt $attempt): EvaluationAttemptResource
    {
        $attempt = $this->attemptService->gradeManualAnswers($request->user(), $attempt, $request->validated('answer_grades'));

        return new EvaluationAttemptResource($attempt->load('answers'));
    }
}
