<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\GradeEvaluationAttemptRequest;
use App\Http\Requests\Api\V1\SubmitEvaluationAttemptRequest;
use App\Http\Resources\AttemptQuestionResource;
use App\Http\Resources\AttemptReviewResource;
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
     * Instructor/admin: every attempt on this evaluation, most recent first — the grading
     * queue for manual (short-answer/essay) scoring pulls from here. Students: only their
     * own attempts — the persistent history that keeps post-attempt review accessible
     * across sessions.
     */
    public function index(Request $request, Evaluation $evaluation): AnonymousResourceCollection
    {
        $user = $request->user();

        if ($user->can('grade', $evaluation)) {
            $attempts = $evaluation->attempts()->with(['student', 'answers'])->latest('submitted_at')->paginate(20);

            return EvaluationAttemptResource::collection($attempts);
        }

        abort_unless($user->can('attempt', $evaluation), 403);

        $attempts = $evaluation->attempts()
            ->where('student_id', $user->id)
            ->latest('started_at')
            ->get();

        return EvaluationAttemptResource::collection($attempts);
    }

    /**
     * Starts (or resumes an in-progress) attempt and returns its questions in the
     * answer-key-free shape (AttemptQuestionResource) — never the bank's admin view.
     */
    public function start(Request $request, Evaluation $evaluation): JsonResponse
    {
        $this->authorize('attempt', $evaluation);

        // Guard: an evaluation with no questions attached cannot be attempted — the submit
        // endpoint requires at least one answer (min:1) so we'd get a 422 anyway; fail early
        // with a clear message so the student sees why instead of a cryptic validation error.
        abort_if(
            $evaluation->questions()->count() === 0,
            422,
            'This evaluation has no questions yet. Your instructor needs to add questions before you can attempt it.',
        );

        $attempt = $this->attemptService->start($request->user(), $evaluation);
        $questions = $this->attemptService->questionsFor($attempt);

        return response()->json([
            'data' => [
                'attempt' => (new EvaluationAttemptResource($attempt))->resolve($request),
                'questions' => AttemptQuestionResource::collection($questions)->resolve($request),
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

    /**
     * Read-only result breakdown for a completed attempt — includes the answer key, so it
     * is hard-gated to submitted attempts and to viewers allowed by the 'view' policy
     * (attempt owner, course instructor, admin). In-progress attempts 422 here, never
     * leaking the key mid-attempt.
     */
    public function review(Request $request, EvaluationAttempt $attempt): AttemptReviewResource
    {
        $this->authorize('view', $attempt);

        abort_unless($attempt->isCompleted(), 422, 'This attempt has not been submitted yet.');

        return new AttemptReviewResource($attempt->load('answers.question.options'));
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
