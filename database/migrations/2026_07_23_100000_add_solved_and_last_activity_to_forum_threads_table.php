<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Threaded-discussion refactor: `solved` lets staff mark a thread resolved; `last_activity_at`
 * drives "latest activity" sort/grouping in the discussion list (bumped on every new reply, not
 * on edits) instead of relying on `created_at`, which never changes after a reply lands.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('forum_threads', function (Blueprint $table): void {
            $table->boolean('solved')->default(false)->after('is_locked');
            // Nullable at the schema level only because altering it NOT NULL afterward would
            // need doctrine/dbal (not installed, same constraint the orders-status migration
            // worked around with raw SQL) — `ForumService` always sets this explicitly on create
            // and on every reply, so it's never actually null in practice.
            $table->dateTime('last_activity_at')->nullable()->after('solved');
            $table->index('last_activity_at', 'idx_threads_last_activity');
        });

        DB::table('forum_threads')->update(['last_activity_at' => DB::raw('created_at')]);
    }

    public function down(): void
    {
        Schema::table('forum_threads', function (Blueprint $table): void {
            $table->dropIndex('idx_threads_last_activity');
            $table->dropColumn(['solved', 'last_activity_at']);
        });
    }
};
