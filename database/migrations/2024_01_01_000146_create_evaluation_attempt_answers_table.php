<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluation_attempt_answers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('attempt_id')->constrained('evaluation_attempts', indexName: 'fk_eaa_attempt')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('questions', indexName: 'fk_eaa_question')->cascadeOnDelete();
            $table->json('selected_option_ids')->nullable()->comment('Array of question_options.id for mcq types');
            $table->text('answer_text')->nullable()->comment('For short_answer/essay');
            $table->boolean('is_correct')->nullable()->comment('NULL until graded for manual types');
            $table->decimal('points_awarded', 6, 2)->nullable();
            $table->foreignId('graded_by')->nullable()->constrained('users', indexName: 'fk_eaa_graded_by')->nullOnDelete();
            $table->dateTime('graded_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluation_attempt_answers');
    }
};
