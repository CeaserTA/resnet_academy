<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add section_id to course_applications to support section-specific applications.
 * Students may have multiple pending applications across different sections of the same course.
 * restrictOnDelete ensures sections with applications cannot be hard-deleted.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_applications', function (Blueprint $table): void {
            $table->foreignId('section_id')->nullable()->after('course_id')
                ->constrained('course_sections')->restrictOnDelete();
            $table->index(['student_id', 'course_id', 'section_id', 'status'], 'idx_apps_student_course_section_status');
        });
    }

    public function down(): void
    {
        Schema::table('course_applications', function (Blueprint $table): void {
            $table->dropForeign(['section_id']);
            $table->dropIndex('idx_apps_student_course_section_status');
            $table->dropColumn('section_id');
        });
    }
};
