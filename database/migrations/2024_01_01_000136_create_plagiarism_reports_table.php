<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plagiarism_reports', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('submission_id')->constrained('assignment_submissions', indexName: 'fk_plagiarism_submission')->cascadeOnDelete();
            $table->decimal('similarity_score', 5, 2)->nullable();
            $table->string('report_url', 500)->nullable();
            $table->dateTime('checked_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plagiarism_reports');
    }
};
