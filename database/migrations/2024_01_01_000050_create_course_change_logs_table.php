<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_change_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_id')->constrained('courses', indexName: 'fk_ccl_course')->cascadeOnDelete();
            $table->unsignedInteger('version_number');
            $table->foreignId('changed_by')->constrained('users', indexName: 'fk_ccl_changed_by')->restrictOnDelete();
            $table->text('change_summary');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_change_logs');
    }
};
