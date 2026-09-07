<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Hard cutover to cohort-only enrolment: every course with orphan (section_id IS NULL)
 * enrolments or applications gets one auto-created "Legacy / Self-paced" cohort + cohort_course
 * row, and those orphan rows are repointed at it. The next migration then makes
 * enrolments.section_id / course_applications.section_id NOT NULL.
 */
return new class extends Migration
{
    public function up(): void
    {
        $orphanCourseIds = DB::table('enrolments')->whereNull('section_id')->distinct()->pluck('course_id')
            ->merge(DB::table('course_applications')->whereNull('section_id')->distinct()->pluck('course_id'))
            ->unique()
            ->values();

        foreach ($orphanCourseIds as $courseId) {
            $course = DB::table('courses')->where('id', $courseId)->first();

            if ($course === null) {
                continue;
            }

            $seatsTaken = DB::table('enrolments')
                ->where('course_id', $courseId)
                ->whereNull('section_id')
                ->whereIn('status', ['confirmed', 'waitlisted', 'transfer_requested', 'transferred'])
                ->count();

            $now = now();

            $cohortId = DB::table('cohorts')->insertGetId([
                'name' => $course->title.' — Legacy / Self-paced',
                'start_date' => $course->schedule_start_date ?? $now->toDateString(),
                'end_date' => $now->copy()->addYears(10)->toDateString(),
                'application_deadline' => null,
                'status' => 'archived',
                'created_by' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $cohortCourseId = DB::table('cohort_courses')->insertGetId([
                'course_id' => $courseId,
                'cohort_id' => $cohortId,
                'name' => 'Legacy / Self-paced',
                'start_date' => $course->schedule_start_date ?? $now->toDateString(),
                'end_date' => $now->copy()->addYears(10)->toDateString(),
                'application_deadline' => null,
                'capacity' => null,
                'seats_taken' => $seatsTaken,
                'status' => 'closed',
                'primary_instructor_id' => null,
                'price_override' => null,
                'currency_override' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('enrolments')->where('course_id', $courseId)->whereNull('section_id')
                ->update(['section_id' => $cohortCourseId]);

            DB::table('course_applications')->where('course_id', $courseId)->whereNull('section_id')
                ->update(['section_id' => $cohortCourseId]);
        }
    }

    public function down(): void
    {
        // Irreversible: which rows were originally NULL is no longer recoverable.
    }
};
