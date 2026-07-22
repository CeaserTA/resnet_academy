<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluation_attempts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('evaluation_id')->constrained('evaluations', indexName: 'fk_attempt_evaluation')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users', indexName: 'fk_attempt_student')->cascadeOnDelete();
            $table->unsignedInteger('attempt_number')->default(1);
            $table->timestamp('started_at')->useCurrent();
            $table->dateTime('submitted_at')->nullable();
            $table->decimal('score_percent', 5, 2)->nullable();
            $table->boolean('passed')->nullable()->comment('score_percent >= evaluation.pass_score; module item completes only when TRUE');
            $table->enum('status', ['in_progress', 'submitted', 'graded'])->default('in_progress');
            $table->index('student_id', 'idx_attempts_student');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluation_attempts');
    }
};
