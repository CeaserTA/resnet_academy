<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('questions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('question_bank_id')->constrained('question_banks', indexName: 'fk_questions_bank')->cascadeOnDelete();
            $table->enum('type', ['mcq_single', 'mcq_multi', 'true_false', 'short_answer', 'essay']);
            $table->text('question_text');
            $table->decimal('points', 6, 2)->default(1.00);
            $table->boolean('auto_gradable')->default(true)->comment('FALSE for short_answer/essay needing manual grading');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
