<?php

declare(strict_types=1);

namespace App\Services\Analytics;

use App\Models\Course;
use App\Models\EngagementEvent;
use App\Models\User;

/**
 * Single write path for `engagement_events`, feeding the analytics dashboard (business rule
 * "Analytics dashboard": completion rates, at-risk flags, engagement metrics).
 *
 * schema.sql's own comment names `login` as an example event_type, but `course_id` is
 * NOT NULL on this table — a plain login has no course context, so it's structurally
 * impossible to record here without picking an arbitrary/wrong course. This tracker only
 * ever records the three genuinely course-scoped signals instead: resource_viewed,
 * assignment_submitted, quiz_attempted.
 */
final class EngagementTracker
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public function track(User $student, Course $course, string $eventType, array $meta = []): EngagementEvent
    {
        return EngagementEvent::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'event_type' => $eventType,
            'event_meta' => $meta,
        ]);
    }
}
