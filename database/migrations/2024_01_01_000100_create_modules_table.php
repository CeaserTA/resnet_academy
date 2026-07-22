<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('course_id')->constrained('courses', indexName: 'fk_modules_course')->cascadeOnDelete();
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->unsignedInteger('order_index')->comment('Defines sequential order for FR-9 locking');
            $table->dateTime('scheduled_start_at')->nullable()->comment('FR-8: null = available as soon as sequentially unlocked');
            $table->timestamps();
            $table->index(['course_id', 'order_index'], 'idx_modules_course_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('modules');
    }
};
