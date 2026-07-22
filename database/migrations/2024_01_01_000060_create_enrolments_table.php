<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enrolments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained('users', indexName: 'fk_enrol_student')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('courses', indexName: 'fk_enrol_course')->cascadeOnDelete();
            $table->enum('status', ['confirmed', 'withdrawn'])
                ->default('confirmed')
                ->comment('No pass/fail gate per FR-3; withdrawn kept for admin-side removal');
            $table->enum('source', ['self', 'admin_bulk'])->default('self');
            $table->foreignId('imported_by')->nullable()->constrained('users', indexName: 'fk_enrol_imported_by')->nullOnDelete()
                ->comment('Admin who ran the bulk/CSV import, if applicable');
            $table->timestamp('applied_at')->useCurrent();
            $table->dateTime('confirmation_email_due_at')->comment('applied_at + course.confirmation_delay_hours');
            $table->dateTime('confirmation_email_sent_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['student_id', 'course_id'], 'uq_enrolment_student_course');
            $table->index('course_id', 'idx_enrolments_course');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrolments');
    }
};
