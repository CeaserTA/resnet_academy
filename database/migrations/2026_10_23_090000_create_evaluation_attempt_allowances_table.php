<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extra quiz attempts granted to one student by staff. Without this, a student who used every
 * attempt on a required evaluation could never complete the module, the course or earn the
 * certificate — there was no way for an instructor to let them try again.
 *
 * One row per (evaluation, student); extra_attempts is added on top of evaluations.max_attempts.
 * See BACKEND_CHANGES.md §3.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluation_attempt_allowances', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('evaluation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedSmallInteger('extra_attempts')->default(0);
            $table->foreignId('granted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason', 500)->nullable();
            $table->timestamps();

            $table->unique(['evaluation_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluation_attempt_allowances');
    }
};
