<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained('users', indexName: 'fk_ticket_student')->cascadeOnDelete();
            $table->foreignId('course_id')->nullable()->constrained('courses', indexName: 'fk_ticket_course')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->comment('Instructor or admin handling it')->constrained('users', indexName: 'fk_ticket_assigned')->nullOnDelete();
            $table->string('subject', 200);
            $table->enum('status', ['open', 'in_progress', 'resolved', 'closed'])->default('open');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('resolved_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
