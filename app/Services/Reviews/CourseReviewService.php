<?php

declare(strict_types=1);

namespace App\Services\Reviews;

use App\Enums\ReviewStatus;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\CourseReview;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * "Completed this course" is deliberately re-derived from `Certificate` existence — the app's
 * one idempotent completion signal (see `CertificateService::issueForCourseCompletion()`) —
 * rather than introducing a second, parallel notion of "done".
 */
final class CourseReviewService
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function submit(User $student, Course $course, int $rating, ?string $reviewText): CourseReview
    {
        $hasCompleted = Certificate::query()
            ->where('student_id', $student->id)
            ->where('course_id', $course->id)
            ->exists();

        if (! $hasCompleted) {
            throw ValidationException::withMessages(['course_id' => 'You must complete this course before reviewing it.']);
        }

        $existing = CourseReview::query()
            ->where('student_id', $student->id)
            ->where('course_id', $course->id)
            ->first();

        if ($existing && $existing->status === ReviewStatus::Approved) {
            throw ValidationException::withMessages(['course_id' => 'You have already reviewed this course.']);
        }

        if ($existing) {
            $existing->update([
                'rating' => $rating,
                'review_text' => $reviewText,
                'status' => ReviewStatus::Pending,
                'admin_notes' => null,
                'reviewed_by' => null,
                'reviewed_at' => null,
            ]);
            $review = $existing->fresh();
        } else {
            $review = CourseReview::create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'rating' => $rating,
                'review_text' => $reviewText,
                'status' => ReviewStatus::Pending,
            ]);
        }

        $this->auditLogger->log(
            action: 'course_review.submitted',
            entityType: 'course_review',
            entityId: $review->id,
            actorId: $student->id,
            meta: ['course_id' => $course->id, 'rating' => $rating],
        );

        return $review;
    }

    public function approve(CourseReview $review, User $admin): CourseReview
    {
        $review->update([
            'status' => ReviewStatus::Approved,
            'reviewed_by' => $admin->id,
            'reviewed_at' => Carbon::now(),
        ]);

        $this->auditLogger->log(
            action: 'course_review.approved',
            entityType: 'course_review',
            entityId: $review->id,
            actorId: $admin->id,
            meta: ['course_id' => $review->course_id, 'student_id' => $review->student_id],
        );

        return $review->fresh();
    }

    public function reject(CourseReview $review, User $admin, ?string $adminNotes): CourseReview
    {
        $review->update([
            'status' => ReviewStatus::Rejected,
            'admin_notes' => $adminNotes,
            'reviewed_by' => $admin->id,
            'reviewed_at' => Carbon::now(),
        ]);

        $this->auditLogger->log(
            action: 'course_review.rejected',
            entityType: 'course_review',
            entityId: $review->id,
            actorId: $admin->id,
            meta: ['course_id' => $review->course_id, 'student_id' => $review->student_id],
        );

        return $review->fresh();
    }

    public function setFeatured(CourseReview $review, User $admin, bool $featured): CourseReview
    {
        if ($review->status !== ReviewStatus::Approved) {
            throw ValidationException::withMessages(['is_featured' => 'Only approved reviews can be featured.']);
        }

        $review->update(['is_featured' => $featured]);

        $this->auditLogger->log(
            action: 'course_review.featured',
            entityType: 'course_review',
            entityId: $review->id,
            actorId: $admin->id,
            meta: ['course_id' => $review->course_id, 'is_featured' => $featured],
        );

        return $review->fresh();
    }
}
