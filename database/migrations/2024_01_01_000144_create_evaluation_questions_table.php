<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluation_questions', function (Blueprint $table): void {
            $table->foreignId('evaluation_id')->constrained('evaluations', indexName: 'fk_eq_evaluation')->cascadeOnDelete();
            $table->foreignId('question_id')->constrained('questions', indexName: 'fk_eq_question')->cascadeOnDelete();
            $table->unsignedInteger('order_index')->default(0);
            $table->primary(['evaluation_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluation_questions');
    }
};
