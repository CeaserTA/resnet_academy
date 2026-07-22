<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('module_progress', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained('users', indexName: 'fk_mp_student')->cascadeOnDelete();
            $table->foreignId('module_id')->constrained('modules', indexName: 'fk_mp_module')->cascadeOnDelete();
            $table->enum('status', ['locked', 'not_started', 'in_progress', 'completed'])->default('locked');
            $table->dateTime('unlocked_at')->nullable()->comment('When scheduled_start_at passed AND previous module completed');
            $table->dateTime('completed_at')->nullable();
            $table->unique(['student_id', 'module_id'], 'uq_module_progress');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('module_progress');
    }
};
