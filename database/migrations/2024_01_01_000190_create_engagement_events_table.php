<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('engagement_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained('users', indexName: 'fk_engagement_student')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('courses', indexName: 'fk_engagement_course')->cascadeOnDelete();
            $table->string('event_type', 60)->comment('e.g. login, resource_viewed, assignment_submitted, quiz_attempted');
            $table->json('event_meta')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['course_id', 'event_type'], 'idx_engagement_course');
            $table->index('student_id', 'idx_engagement_student');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('engagement_events');
    }
};
