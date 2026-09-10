<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Add 'transfer' to enrolments.source enum for transfer-based enrollments.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE enrolments MODIFY COLUMN source ENUM('self', 'admin_bulk', 'transfer') NOT NULL DEFAULT 'self'");
    }

    public function down(): void
    {
        // Remove any transfer records first (change them to self)
        DB::table('enrolments')->where('source', 'transfer')->update(['source' => 'self']);

        DB::statement("ALTER TABLE enrolments MODIFY COLUMN source ENUM('self', 'admin_bulk') NOT NULL DEFAULT 'self'");
    }
};
