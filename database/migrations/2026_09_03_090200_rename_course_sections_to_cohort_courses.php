<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * `course_sections` becomes the cohort<->course join row: what used to be a standalone,
 * course-scoped "section" is now one course's offering within a `cohorts` intake. FK
 * constraints on enrolments/course_applications/module_groups-adjacent tables follow the
 * rename automatically.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('course_sections', 'cohort_courses');
    }

    public function down(): void
    {
        Schema::rename('cohort_courses', 'course_sections');
    }
};
