<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A course can run in several cohorts, but a live session has one date, one meeting link and
     * one attendance list, and those belong to one intake. `cohort_id` ties a session to the
     * cohort it is run for. NULL keeps the old meaning, "for everyone taking the course", so
     * every existing session is unchanged.
     *
     * restrictOnDelete, not nullOnDelete: nulling it would silently turn one cohort's session
     * into a session for every cohort. CohortService::delete() refuses first, with a readable
     * message; this constraint is the backstop.
     */
    public function up(): void
    {
        Schema::table('resource_live_sessions', function (Blueprint $table): void {
            $table->foreignId('cohort_id')
                ->nullable()
                ->after('resource_id')
                ->constrained('cohorts', indexName: 'fk_rls_cohort')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('resource_live_sessions', function (Blueprint $table): void {
            $table->dropForeign('fk_rls_cohort');
            $table->dropColumn('cohort_id');
        });
    }
};
