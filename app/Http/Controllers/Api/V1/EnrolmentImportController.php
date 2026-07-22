<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ImportEnrolmentsRequest;
use App\Jobs\ImportEnrolmentsFromCsv;
use Illuminate\Http\JsonResponse;

/**
 * Business rule 1: admin bulk/CSV enrolment import — queued so a large roster doesn't
 * block the request (ai-workflow-rules.md §6).
 */
final class EnrolmentImportController extends Controller
{
    public function store(ImportEnrolmentsRequest $request): JsonResponse
    {
        $storedPath = $request->file('file')->store('enrolment-imports');

        ImportEnrolmentsFromCsv::dispatch(
            $request->validated('course_id'),
            $storedPath,
            $request->user()->id,
        );

        return response()->json(['status' => 'import-queued'], 202);
    }
}
