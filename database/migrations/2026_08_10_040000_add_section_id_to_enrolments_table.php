<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Add section_id to enrolments and update unique constraint to include section_id.
 * A student can be enrolled in multiple sections of the same course.
 * restrictOnDelete ensures sections with enrollments cannot be hard-deleted.
 * 
 * Note: Cannot drop the unique constraint while orders FK references it, so we:
 * 1. Add section_id column first
 * 2. Add new unique constraint
 * 3. Drop old unique constraint (MySQL will automatically update FK to use new one)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enrolments', function (Blueprint $table): void {
            // Add section_id column
            $table->foreignId('section_id')->nullable()->after('course_id')
                ->constrained('course_sections')->restrictOnDelete();
        });

        Schema::table('enrolments', function (Blueprint $table): void {
            // Add new unique constraint including section_id
            $table->unique(['student_id', 'course_id', 'section_id'], 'uq_enrolment_student_course_section');
        });

        Schema::table('enrolments', function (Blueprint $table): void {
            // Now drop old unique constraint - MySQL will use the new one for FK
            $table->dropUnique('uq_enrolment_student_course');
        });
    }

    public function down(): void
    {
        Schema::table('enrolments', function (Blueprint $table): void {
            // Add back old unique constraint
            $table->unique(['student_id', 'course_id'], 'uq_enrolment_student_course');
        });

        Schema::table('enrolments', function (Blueprint $table): void {
            // Drop new unique constraint
            $table->dropUnique('uq_enrolment_student_course_section');
        });

        Schema::table('enrolments', function (Blueprint $table): void {
            // Drop section_id foreign key and column
            $table->dropForeign(['section_id']);
            $table->dropColumn('section_id');
        });
    }
};
