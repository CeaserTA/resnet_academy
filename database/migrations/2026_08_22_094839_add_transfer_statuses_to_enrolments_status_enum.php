<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Add 'transfer_requested' and 'transferred' to enrolments.status enum for withdraw-after-payment flow.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE enrolments MODIFY COLUMN status ENUM('confirmed', 'withdrawn', 'waitlisted', 'transfer_requested', 'transferred') NOT NULL DEFAULT 'confirmed'");
    }

    public function down(): void
    {
        // Remove any transfer records first (change them to withdrawn)
        DB::table('enrolments')->whereIn('status', ['transfer_requested', 'transferred'])->update(['status' => 'withdrawn']);

        DB::statement("ALTER TABLE enrolments MODIFY COLUMN status ENUM('confirmed', 'withdrawn', 'waitlisted') NOT NULL DEFAULT 'confirmed'");
    }
};
