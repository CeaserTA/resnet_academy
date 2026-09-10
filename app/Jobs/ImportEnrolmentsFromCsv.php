<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\CohortCourse;
use App\Models\User;
use App\Services\Enrolment\BulkEnrolmentImporter;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

/**
 * Business rule 1: admin bulk/CSV enrolment import. Idempotent per BulkEnrolmentImporter
 * (skips students already enrolled), so a retry never double-enrols.
 */
final class ImportEnrolmentsFromCsv implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(
        public readonly int $cohortCourseId,
        public readonly string $storedFilePath,
        public readonly int $importedByUserId,
    ) {}

    public function handle(BulkEnrolmentImporter $importer): void
    {
        $cohortCourse = CohortCourse::query()->findOrFail($this->cohortCourseId);
        $admin = User::query()->findOrFail($this->importedByUserId);

        $importer->import($cohortCourse, Storage::path($this->storedFilePath), $admin);

        Storage::delete($this->storedFilePath);
    }

    public function failed(\Throwable $e): void
    {
        logger()->error('ImportEnrolmentsFromCsv failed', [
            'cohort_course_id' => $this->cohortCourseId,
            'error' => $e->getMessage(),
        ]);
    }
}
