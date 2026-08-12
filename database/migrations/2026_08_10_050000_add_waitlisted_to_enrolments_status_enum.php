<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Add 'waitlisted' to enrolments.status enum for capacity-full sections.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE enrolments MODIFY COLUMN status ENUM('confirmed', 'withdrawn', 'waitlisted') NOT NULL DEFAULT 'confirmed'");
    }

    public function down(): void
    {
        // Remove any waitlisted records first (change them to confirmed)
        DB::table('enrolments')->where('status', 'waitlisted')->update(['status' => 'confirmed']);

        DB::statement("ALTER TABLE enrolments MODIFY COLUMN status ENUM('confirmed', 'withdrawn') NOT NULL DEFAULT 'confirmed'");
    }
};
