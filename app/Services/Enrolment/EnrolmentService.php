<?php

declare(strict_types=1);

namespace App\Services\Enrolment;

use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Enums\OrderStatus;
use App\Jobs\SendEnrolmentConfirmationEmail;
use App\Models\Course;
use App\Models\Enrolment;
use App\Models\Order;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Progress\ProgressEngine;
use Illuminate\Support\Carbon;

/**
 * FR-2/FR-3: every application auto-confirms, no eligibility gate. The only asynchronous
 * part is the per-course confirmation email delay
 */
final class EnrolmentService
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly ProgressEngine $progressEngine,
    ) {}

    public function enrol(User $student, Course $course, EnrolmentSource $source, ?User $importedBy = null): Enrolment
    {
        $appliedAt = Carbon::now();

        $enrolment = Enrolment::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'status' => EnrolmentStatus::Confirmed,
            'source' => $source,
            'imported_by' => $importedBy?->id,
            'applied_at' => $appliedAt,
            'confirmation_email_due_at' => $appliedAt->clone()->addHours($course->confirmation_delay_hours),
        ]);

        Order::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'enrolment_id' => $enrolment->id,
            'amount' => $course->price,
            'currency' => $course->currency,
            'status' => OrderStatus::Pending,
        ]);

        $this->auditLogger->log(
            action: 'enrolment.confirmed',
            entityType: 'enrolment',
            entityId: $enrolment->id,
            // @phpstan-ignore nullsafe.neverNull (false positive: $importedBy is null for self-enrolment)
            actorId: $importedBy?->id ?? $student->id,
            meta: ['course_id' => $course->id, 'source' => $source->value],
        );

        SendEnrolmentConfirmationEmail::dispatch($enrolment->id)
            ->delay($enrolment->confirmation_email_due_at);

        $this->progressEngine->evaluateCourseUnlocks($student, $course);

        return $enrolment;
    }

    /**
     * architecture.md §7 / ai-workflow-rules.md §9: enrolment status changes are one of the
     * three sensitive-mutation categories that must always be audited.
     */
    public function withdraw(Enrolment $enrolment, User $actor): Enrolment
    {
        $previousStatus = $enrolment->status;

        $enrolment->update(['status' => EnrolmentStatus::Withdrawn]);

        $this->auditLogger->log(
            action: 'enrolment.status_changed',
            entityType: 'enrolment',
            entityId: $enrolment->id,
            actorId: $actor->id,
            meta: ['from' => $previousStatus->value, 'to' => EnrolmentStatus::Withdrawn->value],
        );

        return $enrolment->fresh();
    }
}
