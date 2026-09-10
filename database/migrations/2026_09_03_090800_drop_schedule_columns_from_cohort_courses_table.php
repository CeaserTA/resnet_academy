<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A course-in-cohort's identity/schedule is now the cohort's (`cohorts.name` / `start_date` /
 * `end_date` / `application_deadline`, populated by the earlier backfill migration) — these
 * per-row copies are no longer read or written anywhere.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cohort_courses', function (Blueprint $table): void {
            $table->dropColumn(['name', 'start_date', 'end_date', 'application_deadline']);
        });
    }

    public function down(): void
    {
        Schema::table('cohort_courses', function (Blueprint $table): void {
            $table->string('name', 200)->nullable()->after('cohort_id');
            $table->date('start_date')->nullable()->after('name');
            $table->date('end_date')->nullable()->after('start_date');
            $table->date('application_deadline')->nullable()->after('end_date');
        });
    }
};
