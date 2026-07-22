<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assignment_submission_rubric_scores', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('submission_id')->constrained('assignment_submissions', indexName: 'fk_ssr_submission')->cascadeOnDelete();
            $table->foreignId('rubric_id')->constrained('assignment_rubrics', indexName: 'fk_ssr_rubric')->cascadeOnDelete();
            $table->decimal('score', 6, 2);
            $table->text('comment')->nullable();
            $table->unique(['submission_id', 'rubric_id'], 'uq_submission_rubric');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assignment_submission_rubric_scores');
    }
};
