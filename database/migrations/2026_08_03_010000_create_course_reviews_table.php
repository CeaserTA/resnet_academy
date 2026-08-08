<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Unlike `course_applications` (which allows re-apply as new rows), a unique constraint on
 * (student_id, course_id) is deliberate here: one review per student per course, edited in place
 * on resubmission (see `CourseReviewService::submit()`), not re-created.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained('users', indexName: 'fk_course_reviews_student')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('courses', indexName: 'fk_course_reviews_course')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->text('review_text')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('admin_notes')->nullable()->comment('Internal rejection reason, not shown to the student');
            $table->boolean('is_featured')->default(false);
            $table->foreignId('reviewed_by')->nullable()->constrained('users', indexName: 'fk_course_reviews_reviewer')->nullOnDelete();
            $table->dateTime('reviewed_at')->nullable();
            $table->timestamps();
            $table->unique(['student_id', 'course_id'], 'uq_course_review_student_course');
            $table->index(['status', 'is_featured'], 'idx_course_reviews_status_featured');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_reviews');
    }
};
