<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ImportQuestionsCsvRequest;
use App\Http\Requests\Api\V1\StoreQuestionBankRequest;
use App\Http\Resources\QuestionBankResource;
use App\Models\Course;
use App\Models\QuestionBank;
use App\Services\Assessment\QuestionCsvImporter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class QuestionBankController extends Controller
{
    public function __construct(private readonly QuestionCsvImporter $csvImporter) {}

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

    /**
     * Zero-AI bulk import: parses the uploaded CSV row-by-row and creates every
     * question in one transaction (all-or-nothing).
     */
    public function importCsv(ImportQuestionsCsvRequest $request, QuestionBank $bank): JsonResponse
    {
        $result = $this->csvImporter->import($bank, $request->file('csv_file'));

        return response()->json(['data' => $result]);
    }

    public function csvTemplate(): Response
    {
        return response($this->csvImporter->templateCsv(), 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.QuestionCsvImporter::TEMPLATE_FILENAME.'"',
        ]);
    }
}
