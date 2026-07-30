<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A pending application is deliberately its own record, not an `EnrolmentStatus` value — no
 * `enrolments` row exists until an admin approves (see `CourseApplicationService::approve()`,
 * which calls the existing `EnrolmentService::enrol()` unchanged). No unique constraint on
 * (student_id, course_id): a student may submit a new application after a rejection.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_applications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained('users', indexName: 'fk_course_apps_student')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('courses', indexName: 'fk_course_apps_course')->cascadeOnDelete();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->json('answers')->nullable()->comment('Array of strings, positionally matching courses.application_questions');
            $table->string('portfolio_url', 500)->nullable();
            $table->text('alternative_proof_text')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users', indexName: 'fk_course_apps_reviewer')->nullOnDelete();
            $table->dateTime('reviewed_at')->nullable();
            $table->json('recommended_course_ids')->nullable()->comment('Set on reject: beginner-path suggestions for the student');
            $table->timestamps();
            $table->index(['course_id', 'status'], 'idx_course_apps_course_status');
            $table->index('student_id', 'idx_course_apps_student_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_applications');
    }
};
