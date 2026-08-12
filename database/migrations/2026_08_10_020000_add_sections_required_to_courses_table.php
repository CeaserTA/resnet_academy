<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add sections_required flag to courses:
 * - false (default): hybrid mode - students can enroll with or without a section
 * - true: once the course has at least one active section, every enrollment MUST have a section_id
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table): void {
            $table->boolean('sections_required')->default(false)->after('schedule_start_date');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table): void {
            $table->dropColumn('sections_required');
        });
    }
};
