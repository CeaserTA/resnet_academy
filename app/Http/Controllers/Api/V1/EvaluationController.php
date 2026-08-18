<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreEvaluationRequest;
use App\Http\Requests\Api\V1\UpdateEvaluationRequest;
use App\Http\Resources\EvaluationResource;
use App\Models\Evaluation;
use App\Models\EvaluationAttempt;
use App\Models\Module;
use App\Services\Assessment\EvaluationManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class EvaluationController extends Controller
{
    public function __construct(private readonly EvaluationManager $evaluationManager) {}

    public function show(Evaluation $evaluation): EvaluationResource
    {
        $this->authorize('view', $evaluation);

        return new EvaluationResource($evaluation->load('questions.options', 'module'));
    }

    /**
     * Student-facing pre-start summary — metadata only (never questions or the answer key,
     * which stay gated behind EvaluationPolicy::view). Powers the instructions screen:
     * instructor instructions, limits, attempts used/remaining and the question/point totals.
     */
    public function overview(Request $request, Evaluation $evaluation): JsonResponse
    {
        $this->authorize('attempt', $evaluation);

        $user = $request->user();

        $totalQuestions = $evaluation->questions()->count();
        $questionCount = $evaluation->questions_per_attempt !== null
            ? min($evaluation->questions_per_attempt, $totalQuestions)
            : $totalQuestions;

        $myAttempts = $evaluation->attempts()
            ->where('student_id', $user->id)
            ->latest('started_at')
            ->get();

        $attemptsUsed = $myAttempts->count();
        $inProgress = $myAttempts->first(fn (EvaluationAttempt $attempt): bool => $attempt->submitted_at === null);

        return response()->json([
            'data' => [
                'id' => $evaluation->id,
                'title' => $evaluation->title,
                'description' => $evaluation->description,
                'instructions' => $evaluation->instructions,
                'pass_score' => $evaluation->pass_score,
                'time_limit_minutes' => $evaluation->time_limit_minutes,
                'max_attempts' => $evaluation->max_attempts,
                'question_count' => $questionCount,
                'total_points' => (float) $evaluation->questions()->sum('points'),
                'attempts_used' => $attemptsUsed,
                'attempts_remaining' => $evaluation->max_attempts === null
                    ? null
                    : max(0, $evaluation->max_attempts - $attemptsUsed),
                'in_progress_attempt' => $inProgress === null ? null : [
                    'id' => $inProgress->id,
                    'started_at' => $inProgress->started_at->toIso8601String(),
                ],
            ],
        ]);
    }

    public function store(StoreEvaluationRequest $request, Module $module): EvaluationResource
    {
        $evaluation = $this->evaluationManager->create($module, $request->validated());

        return new EvaluationResource($evaluation->load('questions.options', 'module'));
    }

    public function update(UpdateEvaluationRequest $request, Evaluation $evaluation): EvaluationResource
    {
        $evaluation = $this->evaluationManager->update($evaluation, $request->validated());

        return new EvaluationResource($evaluation->load('questions.options', 'module'));
    }

    public function destroy(Evaluation $evaluation): Response
    {
        $this->authorize('delete', $evaluation);

        $this->evaluationManager->delete($evaluation);

        return response()->noContent();
    }
}
