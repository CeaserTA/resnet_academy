<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('module_id')->constrained('modules', indexName: 'fk_evaluations_module')->cascadeOnDelete();
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->decimal('pass_score', 5, 2)->comment('Percent required to count module item as complete');
            $table->unsignedInteger('max_attempts')->nullable()->comment('NULL = unlimited retakes');
            $table->unsignedInteger('time_limit_minutes')->nullable();
            $table->boolean('randomize_questions')->default(false);
            $table->unsignedInteger('questions_per_attempt')->nullable()->comment('For question-bank pull; NULL = use all linked questions');
            $table->dateTime('available_from')->nullable();
            $table->dateTime('available_until')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluations');
    }
};
