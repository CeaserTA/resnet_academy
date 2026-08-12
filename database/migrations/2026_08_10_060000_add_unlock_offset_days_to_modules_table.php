<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add unlock_offset_days to modules for section-relative scheduling.
 * Days after section.start_date this module unlocks.
 * Leave scheduled_start_at in place for self-paced courses.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('modules', function (Blueprint $table): void {
            $table->integer('unlock_offset_days')->unsigned()->nullable()->after('scheduled_start_at')
                ->comment('Days after section start_date this module unlocks (NULL = use scheduled_start_at instead)');
        });
    }

    public function down(): void
    {
        Schema::table('modules', function (Blueprint $table): void {
            $table->dropColumn('unlock_offset_days');
        });
    }
};
