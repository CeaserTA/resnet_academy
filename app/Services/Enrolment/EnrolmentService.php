<?php

declare(strict_types=1);

namespace App\Services\Enrolment;

use App\Enums\CourseSectionStatus;
use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Enums\OrderStatus;
use App\Jobs\SendEnrolmentConfirmationEmail;
use App\Models\Course;
use App\Models\CourseSection;
use App\Models\Enrolment;
use App\Models\Order;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Progress\ProgressEngine;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * FR-2/FR-3: every application auto-confirms, no eligibility gate. The only asynchronous
 * part is the per-course confirmation email delay.
 *
 * With course sections: enrollments may be waitlisted if section capacity is reached.
 */
final class EnrolmentService
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly ProgressEngine $progressEngine,
        private readonly NotificationDispatcher $notificationDispatcher,
    ) {}

    /**
     * Enroll a student in a course, optionally in a specific section.
     *
     * Uses pessimistic locking (SELECT ... FOR UPDATE) on the section row to prevent
     * race conditions when checking/incrementing seats_taken.
     */
    public function enrol(User $student, Course $course, EnrolmentSource $source, ?int $sectionId = null, ?User $importedBy = null): Enrolment
    {
        return DB::transaction(function () use ($student, $course, $source, $sectionId, $importedBy) {
            $section = null;
            $status = EnrolmentStatus::Confirmed;
            $appliedAt = Carbon::now();

            // If section_id provided, lock the section row and check capacity
            if ($sectionId !== null) {
                $section = CourseSection::where('id', $sectionId)
                    ->where('course_id', $course->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                // Validate section is in acceptable status
                if ($section->status === CourseSectionStatus::Draft) {
                    throw ValidationException::withMessages(['section_id' => 'This section is not yet open for enrollment.']);
                }

                if ($section->status === CourseSectionStatus::Closed) {
                    throw ValidationException::withMessages(['section_id' => 'This section is closed for enrollment.']);
                }

                // Check capacity - if full, create as waitlisted
                if ($section->capacity !== null && $section->seats_taken >= $section->capacity) {
                    $status = EnrolmentStatus::Waitlisted;
                }
            } else {
                // No section provided - check if course requires sections
                if ($course->sections_required) {
                    $hasActiveSections = $course->sections()
                        ->whereNotIn('status', [CourseSectionStatus::Draft, CourseSectionStatus::Completed])
                        ->exists();

                    if ($hasActiveSections) {
                        throw ValidationException::withMessages(['section_id' => 'This course requires enrollment in a specific section.']);
                    }
                }

                // Explicit check for duplicate self-paced enrollment (MySQL allows multiple NULL in unique constraint)
                $existingSelfPacedEnrolment = Enrolment::where('student_id', $student->id)
                    ->where('course_id', $course->id)
                    ->whereNull('section_id')
                    ->where('status', EnrolmentStatus::Confirmed)
                    ->exists();

                if ($existingSelfPacedEnrolment) {
                    throw ValidationException::withMessages(['course_id' => 'You are already enrolled in this course.']);
                }
            }

            // Create the enrollment
            $enrolment = Enrolment::create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'section_id' => $sectionId,
                'status' => $status,
                'source' => $source,
                'imported_by' => $importedBy?->id,
                'applied_at' => $appliedAt,
                'confirmation_email_due_at' => $appliedAt->clone()->addHours($course->confirmation_delay_hours),
            ]);

            // Only increment seats_taken and create order if confirmed (not waitlisted)
            if ($status === EnrolmentStatus::Confirmed) {
                if ($section !== null) {
                    $section->increment('seats_taken');
                }

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
                    meta: ['course_id' => $course->id, 'section_id' => $sectionId, 'source' => $source->value],
                );

                SendEnrolmentConfirmationEmail::dispatch($enrolment->id)
                    ->delay($enrolment->confirmation_email_due_at);

                $this->progressEngine->evaluateCourseUnlocks($student, $course);
            } else {
                // Waitlisted
                $this->auditLogger->log(
                    action: 'enrolment.waitlisted',
                    entityType: 'enrolment',
                    entityId: $enrolment->id,
                    // @phpstan-ignore nullsafe.neverNull (same false positive as the confirmed branch above)
                    actorId: $importedBy?->id ?? $student->id,
                    meta: ['course_id' => $course->id, 'section_id' => $sectionId, 'source' => $source->value],
                );
            }

            return $enrolment;
        });
    }

    /**
     * Withdraw an enrollment. If the enrollment was in a section with capacity,
     * decrement seats_taken and promote the oldest waitlisted student.
     *
     * architecture.md §7 / ai-workflow-rules.md §9: enrolment status changes are one of the
     * three sensitive-mutation categories that must always be audited.
     */
    public function withdraw(Enrolment $enrolment, User $actor): Enrolment
    {
        return DB::transaction(function () use ($enrolment, $actor) {
            $previousStatus = $enrolment->status;

            $enrolment->update(['status' => EnrolmentStatus::Withdrawn]);

            $this->auditLogger->log(
                action: 'enrolment.status_changed',
                entityType: 'enrolment',
                entityId: $enrolment->id,
                actorId: $actor->id,
                meta: [
                    'from' => $previousStatus->value,
                    'to' => EnrolmentStatus::Withdrawn->value,
                    'section_id' => $enrolment->section_id,
                ],
            );

            // If this was a confirmed enrollment in a section, handle waitlist promotion
            if ($previousStatus === EnrolmentStatus::Confirmed && $enrolment->section_id !== null) {
                $section = CourseSection::where('id', $enrolment->section_id)
                    ->lockForUpdate()
                    ->first();

                if ($section) {
                    $section->decrement('seats_taken');

                    // Promote oldest waitlisted enrollment
                    $waitlisted = Enrolment::where('section_id', $section->id)
                        ->where('status', EnrolmentStatus::Waitlisted)
                        ->orderBy('created_at', 'asc')
                        ->lockForUpdate()
                        ->first();

                    if ($waitlisted) {
                        $this->promoteFromWaitlist($waitlisted, $section);
                    }
                }
            }

            return $enrolment->fresh();
        });
    }

    /**
     * Admin-driven status change between the three lifecycle states. Withdrawals delegate to
     * withdraw() so seat release + waitlist promotion still happen; confirming re-runs the
     * section capacity check and the confirmed side-effects (order, email, progress eval).
     */
    public function changeStatus(Enrolment $enrolment, EnrolmentStatus $newStatus, User $actor): Enrolment
    {
        if ($enrolment->status === $newStatus) {
            return $enrolment;
        }

        if ($newStatus === EnrolmentStatus::Withdrawn) {
            return $this->withdraw($enrolment, $actor);
        }

        return DB::transaction(function () use ($enrolment, $newStatus, $actor) {
            $previousStatus = $enrolment->status;

            if ($newStatus === EnrolmentStatus::Confirmed) {
                $section = null;

                if ($enrolment->section_id !== null) {
                    $section = CourseSection::where('id', $enrolment->section_id)
                        ->lockForUpdate()
                        ->firstOrFail();

                    if ($section->capacity !== null && $section->seats_taken >= $section->capacity) {
                        throw ValidationException::withMessages([
                            'status' => 'This section has no free seats. Increase its capacity before confirming.',
                        ]);
                    }
                }

                $enrolment->update(['status' => EnrolmentStatus::Confirmed]);

                if ($section !== null) {
                    $section->increment('seats_taken');
                }

                // Waitlisted enrolments never got an order — create it on confirmation.
                if (! $enrolment->order()->exists()) {
                    Order::create([
                        'student_id' => $enrolment->student_id,
                        'course_id' => $enrolment->course_id,
                        'enrolment_id' => $enrolment->id,
                        'amount' => $enrolment->course->price,
                        'currency' => $enrolment->course->currency,
                        'status' => OrderStatus::Pending,
                    ]);
                }

                SendEnrolmentConfirmationEmail::dispatch($enrolment->id)
                    ->delay($enrolment->confirmation_email_due_at);

                $this->progressEngine->evaluateCourseUnlocks($enrolment->student, $enrolment->course);
            } else {
                // Demotion to waitlisted — release the seat if one was held.
                if ($previousStatus === EnrolmentStatus::Confirmed && $enrolment->section_id !== null) {
                    $section = CourseSection::where('id', $enrolment->section_id)
                        ->lockForUpdate()
                        ->first();

                    $section?->decrement('seats_taken');
                }

                $enrolment->update(['status' => EnrolmentStatus::Waitlisted]);
            }

            $this->auditLogger->log(
                action: 'enrolment.status_changed',
                entityType: 'enrolment',
                entityId: $enrolment->id,
                actorId: $actor->id,
                meta: [
                    'from' => $previousStatus->value,
                    'to' => $newStatus->value,
                    'section_id' => $enrolment->section_id,
                ],
            );

            return $enrolment->fresh();
        });
    }

    /**
     * Promote a waitlisted enrollment to confirmed status.
     * Creates order, queues confirmation email, initializes progress.
     * 
     * Public method - can be called by EnrolmentService::withdraw() or CourseSectionService::update()
     */
    public function promoteFromWaitlist(Enrolment $enrolment, CourseSection $section): void
    {
        $enrolment->update(['status' => EnrolmentStatus::Confirmed]);

        $section->increment('seats_taken');

        // Create order for the promoted student
        Order::create([
            'student_id' => $enrolment->student_id,
            'course_id' => $enrolment->course_id,
            'enrolment_id' => $enrolment->id,
            'amount' => $enrolment->course->price,
            'currency' => $enrolment->course->currency,
            'status' => OrderStatus::Pending,
        ]);

        $this->auditLogger->log(
            action: 'enrolment.promoted_from_waitlist',
            entityType: 'enrolment',
            entityId: $enrolment->id,
            actorId: $enrolment->student_id,
            meta: ['course_id' => $enrolment->course_id, 'section_id' => $section->id],
        );

        // Send notification about promotion
        $this->notificationDispatcher->notify(
            user: $enrolment->student,
            type: 'waitlist_promoted',
            title: "You've been enrolled in {$enrolment->course->title}",
            body: "A seat opened up in {$section->name} and you've been promoted from the waitlist.",
            relatedEntityType: 'enrolment',
            relatedEntityId: $enrolment->id,
        );

        // Queue confirmation email
        SendEnrolmentConfirmationEmail::dispatch($enrolment->id)
            ->delay($enrolment->confirmation_email_due_at);

        // Initialize progress
        $this->progressEngine->evaluateCourseUnlocks($enrolment->student, $enrolment->course);
    }
}
