<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('forum_threads', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('forum_id')->constrained('forums', indexName: 'fk_thread_forum')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users', indexName: 'fk_thread_creator')->cascadeOnDelete();
            $table->string('title', 200);
            $table->boolean('is_pinned')->default(false);
            $table->boolean('is_locked')->default(false);
            $table->timestamp('created_at')->useCurrent();
            $table->index('forum_id', 'idx_threads_forum');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('forum_threads');
    }
};
