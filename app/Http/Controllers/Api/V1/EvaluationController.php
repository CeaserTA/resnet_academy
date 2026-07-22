<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreEvaluationRequest;
use App\Http\Requests\Api\V1\UpdateEvaluationRequest;
use App\Http\Resources\EvaluationResource;
use App\Models\Evaluation;
use App\Services\Assessment\EvaluationManager;
use Illuminate\Http\Response;

final class EvaluationController extends Controller
{
    public function __construct(private readonly EvaluationManager $evaluationManager) {}

    public function show(Evaluation $evaluation): EvaluationResource
    {
        $this->authorize('view', $evaluation);

        return new EvaluationResource($evaluation->load('questions.options'));
    }

    public function store(StoreEvaluationRequest $request): EvaluationResource
    {
        $evaluation = $this->evaluationManager->create($request->route('module'), $request->validated());

        return new EvaluationResource($evaluation->load('questions.options'));
    }

    public function update(UpdateEvaluationRequest $request, Evaluation $evaluation): EvaluationResource
    {
        $evaluation = $this->evaluationManager->update($evaluation, $request->validated());

        return new EvaluationResource($evaluation->load('questions.options'));
    }

    public function destroy(Evaluation $evaluation): Response
    {
        $this->authorize('delete', $evaluation);

        $this->evaluationManager->delete($evaluation);

        return response()->noContent();
    }
}
