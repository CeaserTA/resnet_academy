<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A cohort is an intake (e.g. "September 2026 Intake") that offers multiple courses, each
 * with its own capacity/instructor — see `cohort_courses` (renamed from `course_sections` in
 * the next migration) for the per-course-in-cohort attributes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cohorts', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 200)->comment('e.g. "September 2026 Intake"');
            $table->date('start_date');
            $table->date('end_date');
            $table->date('application_deadline')->nullable();
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cohorts');
    }
};
