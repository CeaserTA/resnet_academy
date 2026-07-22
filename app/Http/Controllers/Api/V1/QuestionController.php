<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreQuestionRequest;
use App\Http\Resources\QuestionResource;
use App\Models\Question;
use App\Models\QuestionBank;
use App\Services\Assessment\QuestionManager;
use Illuminate\Http\Response;

final class QuestionController extends Controller
{
    public function __construct(private readonly QuestionManager $questionManager) {}

    public function store(StoreQuestionRequest $request, QuestionBank $bank): QuestionResource
    {
        $question = $this->questionManager->create($bank, $request->validated());

        return new QuestionResource($question->load('options'));
    }

    public function destroy(Question $question): Response
    {
        $this->authorize('update', $question->bank);

        $this->questionManager->delete($question);

        return response()->noContent();
    }
}
