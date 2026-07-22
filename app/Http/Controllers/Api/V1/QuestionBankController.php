<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreQuestionBankRequest;
use App\Http\Resources\QuestionBankResource;
use App\Models\Course;
use App\Models\QuestionBank;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class QuestionBankController extends Controller
{
    public function index(Course $course): AnonymousResourceCollection
    {
        $this->authorize('viewAny', [QuestionBank::class, $course]);

        return QuestionBankResource::collection($course->questionBanks()->with('questions.options')->get());
    }

    public function store(StoreQuestionBankRequest $request, Course $course): QuestionBankResource
    {
        $bank = $course->questionBanks()->create($request->validated());

        return new QuestionBankResource($bank);
    }

    public function destroy(QuestionBank $bank): Response
    {
        $this->authorize('delete', $bank);

        $bank->delete();

        return response()->noContent();
    }
}
