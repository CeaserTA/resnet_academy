<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversation_participants', function (Blueprint $table): void {
            $table->foreignId('conversation_id')->constrained('conversations', indexName: 'fk_cp_conversation')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users', indexName: 'fk_cp_user')->cascadeOnDelete();
            $table->timestamp('joined_at')->useCurrent();
            $table->primary(['conversation_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_participants');
    }
};
