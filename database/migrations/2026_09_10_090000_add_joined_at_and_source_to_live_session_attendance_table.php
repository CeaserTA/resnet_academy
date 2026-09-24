<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Phase 1 of verified attendance: `joined_at` is set the moment a student actually clicks
     * through the join link (ProgressEngine::joinLiveSession), replacing the old self-report
     * flow where `attended` could be set with no proof the student ever opened the session.
     * `source` records how the row was created — 'click' today; 'api' is reserved for a later
     * phase that verifies attendance against the Zoom/Google Meet participant APIs, without
     * needing another migration when that phase ships.
     */
    public function up(): void
    {
        Schema::table('live_session_attendance', function (Blueprint $table): void {
            $table->timestamp('joined_at')->nullable()->after('attended');
            $table->string('source', 20)->nullable()->after('joined_at')->comment("'click' (student followed the join link) or 'api' (future provider-verified phase)");
        });
    }

    public function down(): void
    {
        Schema::table('live_session_attendance', function (Blueprint $table): void {
            $table->dropColumn(['joined_at', 'source']);
        });
    }
};
