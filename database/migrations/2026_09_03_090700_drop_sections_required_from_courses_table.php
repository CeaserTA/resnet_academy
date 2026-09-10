<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cohort membership is now mandatory for every enrolment (see the previous migration), so the
 * hybrid self-paced/cohort toggle no longer means anything.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table): void {
            $table->dropColumn('sections_required');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table): void {
            $table->boolean('sections_required')->default(false)->after('schedule_start_date');
        });
    }
};
