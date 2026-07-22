<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assignment_submissions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('assignment_id')->constrained('assignments', indexName: 'fk_submission_assignment')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users', indexName: 'fk_submission_student')->cascadeOnDelete();
            $table->unsignedInteger('attempt_number')->default(1);
            $table->string('file_url', 500)->nullable();
            $table->mediumText('text_content')->nullable();
            $table->timestamp('submitted_at')->useCurrent();
            $table->boolean('is_late')->default(false);
            $table->decimal('late_penalty_percent', 5, 2)->default(0.00);
            $table->enum('status', ['submitted', 'graded'])
                ->default('submitted')
                ->comment('Module completion counts on submitted, not graded');
            $table->decimal('raw_score', 6, 2)->nullable();
            $table->decimal('final_score', 6, 2)->nullable()->comment('raw_score after late penalty applied');
            $table->text('feedback')->nullable();
            $table->foreignId('graded_by')->nullable()->constrained('users', indexName: 'fk_submission_graded_by')->nullOnDelete();
            $table->dateTime('graded_at')->nullable();
            $table->index('student_id', 'idx_submissions_student');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assignment_submissions');
    }
};
