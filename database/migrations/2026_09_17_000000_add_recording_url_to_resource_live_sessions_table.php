<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A live session is a required module item, but its join window closes 30 minutes after the
 * session ends — so a student who enrols afterwards could never complete it, permanently
 * blocking the module, the course and the certificate. Attaching a recording gives that student
 * a way through: opening the recording completes the item, exactly as opening an external link
 * does.
 *
 * Nullable on purpose — "no recording attached yet" is a real, expected state that the student
 * UI surfaces as "recording pending" rather than an error.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resource_live_sessions', function (Blueprint $table): void {
            $table->string('recording_url', 500)
                ->nullable()
                ->after('duration_minutes')
                ->comment('Zoom cloud or Google Drive link; students complete the item by opening it once the session has passed');
        });
    }

    public function down(): void
    {
        Schema::table('resource_live_sessions', function (Blueprint $table): void {
            $table->dropColumn('recording_url');
        });
    }
};
