<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Threaded-discussion refactor: tags are global (not course-scoped) — the example vocabulary
 * (Flutter, Widgets, Navigation, Database, Assignments, Authentication) is generic/technical
 * rather than tied to one course, so sharing one tag set avoids duplicate "Flutter" rows per
 * course. Any thread author can create a new tag on the fly (find-or-create by name).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('forum_tags', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 50)->unique();
            $table->string('slug', 50)->unique();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('forum_thread_tag', function (Blueprint $table): void {
            $table->foreignId('thread_id')->constrained('forum_threads', indexName: 'fk_thread_tag_thread')->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained('forum_tags', indexName: 'fk_thread_tag_tag')->cascadeOnDelete();
            $table->primary(['thread_id', 'tag_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('forum_thread_tag');
        Schema::dropIfExists('forum_tags');
    }
};
