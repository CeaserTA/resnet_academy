<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Every pre-existing `cohort_courses` row (formerly a standalone `course_sections` row)
 * becomes its own single-course cohort, carrying its name/dates/application_deadline up to
 * a new `cohorts` row and its status mapped onto `CohortStatus`. Admins merge sibling
 * course-offerings into one real multi-course cohort later via the new admin UI — this
 * migration deliberately does no automatic merge-by-name/date heuristics.
 */
return new class extends Migration
{
    public function up(): void
    {
        $statusMap = [
            'draft' => 'draft',
            'open' => 'published',
            'in_progress' => 'published',
            'closed' => 'archived',
            'completed' => 'archived',
        ];

        DB::table('cohort_courses')->orderBy('id')->chunkById(100, function ($rows) use ($statusMap): void {
            foreach ($rows as $row) {
                $cohortId = DB::table('cohorts')->insertGetId([
                    'name' => $row->name,
                    'start_date' => $row->start_date,
                    'end_date' => $row->end_date,
                    'application_deadline' => $row->application_deadline,
                    'status' => $statusMap[$row->status] ?? 'draft',
                    'created_by' => null,
                    'created_at' => $row->created_at,
                    'updated_at' => $row->updated_at,
                ]);

                DB::table('cohort_courses')->where('id', $row->id)->update(['cohort_id' => $cohortId]);
            }
        });
    }

    public function down(): void
    {
        // Irreversible: cohorts created here may since have been merged/edited by admins.
    }
};
