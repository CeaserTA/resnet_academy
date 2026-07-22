<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations', indexName: 'fk_msg_conversation')->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users', indexName: 'fk_msg_sender')->cascadeOnDelete();
            $table->text('body');
            $table->timestamp('sent_at')->useCurrent();
            $table->timestamp('read_at')->nullable()->comment('Read receipts');
            $table->index(['conversation_id', 'sent_at'], 'idx_messages_conversation');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
