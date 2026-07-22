<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('forum_posts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('thread_id')->constrained('forum_threads', indexName: 'fk_post_thread')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users', indexName: 'fk_post_user')->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();
            $table->index('thread_id', 'idx_posts_thread');
            $table->fullText('body', 'ftx_posts_body');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('forum_posts');
    }
};
