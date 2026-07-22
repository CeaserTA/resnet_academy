<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('live_session_attendance', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('resource_id')->constrained('resources', indexName: 'fk_lsa_resource')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users', indexName: 'fk_lsa_student')->cascadeOnDelete();
            $table->boolean('attended')->default(false);
            $table->dateTime('marked_at')->nullable();
            $table->foreignId('marked_by')->nullable()->comment('Instructor if manually marked; null if auto-tracked')->constrained('users', indexName: 'fk_lsa_marked_by')->nullOnDelete();
            $table->unique(['resource_id', 'student_id'], 'uq_attendance');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('live_session_attendance');
    }
};
