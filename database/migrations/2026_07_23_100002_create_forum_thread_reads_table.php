<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Threaded-discussion refactor: the discussion list's "unread" indicator needs per-user
 * read-state, which nothing in the schema tracked before. A thread is unread for a user when
 * `forum_threads.last_activity_at` is newer than their row here (or they have no row at all).
 * Upserted every time `ForumThreadController::show()` is opened.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('forum_thread_reads', function (Blueprint $table): void {
            $table->foreignId('user_id')->constrained('users', indexName: 'fk_thread_read_user')->cascadeOnDelete();
            $table->foreignId('thread_id')->constrained('forum_threads', indexName: 'fk_thread_read_thread')->cascadeOnDelete();
            $table->dateTime('last_read_at');
            $table->primary(['user_id', 'thread_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('forum_thread_reads');
    }
};
