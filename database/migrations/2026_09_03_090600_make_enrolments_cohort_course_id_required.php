<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Hard cutover: every enrolment/application now belongs to a specific course-within-a-cohort
 * (the previous migration backfilled a "Legacy / Self-paced" cohort for every orphan row, so
 * this NOT NULL is safe). Raw CHANGE COLUMN is used instead of Blueprint::change() because this
 * project has no doctrine/dbal dependency — MySQL's CHANGE COLUMN renames in place and keeps
 * the existing foreign key attached to the column.
 *
 * Every step is guarded to be safely re-runnable: MySQL DDL auto-commits per statement (no
 * transactional rollback), so if a later step in this migration ever fails, an earlier step
 * that already succeeded must not be re-attempted on the next `migrate` run.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('enrolments', 'section_id')) {
            DB::statement('ALTER TABLE enrolments CHANGE section_id cohort_course_id BIGINT UNSIGNED NOT NULL');
        }

        if (Schema::hasColumn('course_applications', 'section_id')) {
            DB::statement('ALTER TABLE course_applications CHANGE section_id cohort_course_id BIGINT UNSIGNED NOT NULL');
        }

        // Add the new unique index BEFORE dropping the old one — MySQL refuses to drop an
        // index while it's the sole index satisfying the cohort_course_id foreign key, so the
        // replacement must exist first (same ordering the original section_id migration used
        // for exactly this reason).
        if (! $this->indexExists('enrolments', 'uq_enrolment_student_cohort_course')) {
            Schema::table('enrolments', function (Blueprint $table): void {
                $table->unique(['student_id', 'cohort_course_id'], 'uq_enrolment_student_cohort_course');
            });
        }

        if ($this->indexExists('enrolments', 'uq_enrolment_student_course_section')) {
            Schema::table('enrolments', function (Blueprint $table): void {
                $table->dropUnique('uq_enrolment_student_course_section');
            });
        }
    }

    private function indexExists(string $table, string $indexName): bool
    {
        return DB::table('information_schema.statistics')
            ->where('table_schema', DB::getDatabaseName())
            ->where('table_name', $table)
            ->where('index_name', $indexName)
            ->exists();
    }

    public function down(): void
    {
        Schema::table('enrolments', function (Blueprint $table): void {
            $table->unique(['student_id', 'course_id', 'cohort_course_id'], 'uq_enrolment_student_course_section');
        });

        Schema::table('enrolments', function (Blueprint $table): void {
            $table->dropUnique('uq_enrolment_student_cohort_course');
        });

        DB::statement('ALTER TABLE enrolments CHANGE cohort_course_id section_id BIGINT UNSIGNED NULL');
        DB::statement('ALTER TABLE course_applications CHANGE cohort_course_id section_id BIGINT UNSIGNED NULL');
    }
};
