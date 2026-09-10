<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Update notification channel enum to match NotificationChannel enum values.
 * The database already has the correct values, but this ensures consistency.
 */
return new class extends Migration
{
    public function up(): void
    {
        // The database already has the correct enum values, but this ensures
        // they match the NotificationChannel enum exactly
        DB::statement("ALTER TABLE notifications MODIFY COLUMN channel ENUM('in_app', 'email', 'sms', 'push') NOT NULL DEFAULT 'in_app'");
    }

    public function down(): void
    {
        // No changes needed - the values are already correct
    }
};
