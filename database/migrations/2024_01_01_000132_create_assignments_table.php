<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assignments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('module_id')->constrained('modules', indexName: 'fk_assignments_module')->cascadeOnDelete();
            $table->string('title', 200);
            $table->text('instructions')->nullable();
            $table->enum('submission_type', ['file', 'text', 'both'])->default('both');
            $table->dateTime('due_at')->nullable();
            $table->boolean('allow_late')->default(true);
            $table->foreignId('late_penalty_policy_id')->nullable()->constrained('late_penalty_policies', indexName: 'fk_assignments_policy')->nullOnDelete();
            $table->decimal('max_score', 6, 2)->default(100.00);
            $table->boolean('plagiarism_check_enabled')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assignments');
    }
};
