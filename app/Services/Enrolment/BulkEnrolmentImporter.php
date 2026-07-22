<?php

declare(strict_types=1);

namespace App\Services\Enrolment;

use App\Enums\EnrolmentSource;
use App\Enums\UserRole;
use App\Models\Course;
use App\Models\Enrolment;
use App\Models\User;
use App\Services\Audit\AuditLogger;

/**
 * Business rule 1: admin bulk/CSV enrolment — an override path for edge cases, even though
 * the primary path is automated self-enrolment. Idempotent on (student_id, course_id): a
 * student already enrolled in the course is skipped, not duplicated or re-notified.
 */
final class BulkEnrolmentImporter
{
    public function __construct(
        private readonly EnrolmentService $enrolmentService,
        private readonly AuditLogger $auditLogger,
    ) {}

    /**
     * @return array{imported: int, skipped: list<string>}
     */
    public function import(Course $course, string $absoluteCsvPath, User $admin): array
    {
        $imported = 0;
        $skipped = [];

        $handle = fopen($absoluteCsvPath, 'rb');

        if ($handle === false) {
            throw new \RuntimeException("Unable to open CSV file at {$absoluteCsvPath}");
        }

        $header = fgetcsv($handle);
        $emailColumn = is_array($header) ? array_search('email', array_map(strtolower(...), $header), true) : false;
        $emailColumn = $emailColumn === false ? 0 : $emailColumn;

        while (($row = fgetcsv($handle)) !== false) {
            $email = mb_strtolower(trim((string) ($row[$emailColumn] ?? '')));

            if ($email === '') {
                continue;
            }

            $student = User::query()->where('email', $email)->where('role', UserRole::Student)->first();

            if (! $student) {
                $skipped[] = "{$email}: no student account found";

                continue;
            }

            $alreadyEnrolled = Enrolment::query()
                ->where('student_id', $student->id)
                ->where('course_id', $course->id)
                ->exists();

            if ($alreadyEnrolled) {
                $skipped[] = "{$email}: already enrolled";

                continue;
            }

            $this->enrolmentService->enrol($student, $course, EnrolmentSource::AdminBulk, $admin);
            $imported++;
        }

        fclose($handle);

        $this->auditLogger->log(
            action: 'enrolment.bulk_import',
            entityType: 'course',
            entityId: $course->id,
            actorId: $admin->id,
            meta: ['imported' => $imported, 'skipped' => $skipped],
        );

        return ['imported' => $imported, 'skipped' => $skipped];
    }
}
