<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained('categories', indexName: 'fk_courses_category')->nullOnDelete();
            $table->string('title', 200);
            $table->string('slug', 220);
            $table->text('description')->nullable();
            $table->enum('level', ['beginner', 'intermediate', 'advanced'])->default('beginner');
            $table->string('thumbnail_url', 500)->nullable();
            $table->text('prerequisites_text')->nullable()->comment('Informational only, per FR-3 — not programmatically enforced');
            $table->decimal('price', 10, 2)->default(0);
            $table->char('currency', 3)->default('UGX');
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
            $table->unsignedInteger('current_version')->default(1);
            $table->unsignedInteger('confirmation_delay_hours')->default(24)->comment('FR-4: configurable per course, default 1 day');
            $table->date('schedule_start_date')->nullable()->comment('Course-level start reference used to compute module week offsets');
            $table->foreignId('created_by')->constrained('users', indexName: 'fk_courses_created_by')->restrictOnDelete();
            $table->timestamps();
            $table->unique('slug', 'uq_courses_slug');
            $table->index('status', 'idx_courses_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
