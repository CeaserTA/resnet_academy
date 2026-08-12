<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Course sections represent scheduled, capacity-limited runs of a course (cohorts).
 * A course can have zero sections (stays self-paced) or multiple sections running
 * concurrently or sequentially.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_sections', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->string('name', 200)->comment('e.g. "Spring 2026 Cohort"');
            $table->date('start_date');
            $table->date('end_date');
            $table->date('application_deadline')->nullable();
            $table->integer('capacity')->unsigned()->nullable()->comment('NULL = unlimited');
            $table->integer('seats_taken')->unsigned()->default(0);
            $table->enum('status', ['draft', 'open', 'closed', 'in_progress', 'completed'])->default('draft');
            $table->foreignId('primary_instructor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['course_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_sections');
    }
};
