<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('oauth_accounts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users', indexName: 'fk_oauth_user')->cascadeOnDelete();
            $table->enum('provider', ['google']);
            $table->string('provider_user_id', 191);
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['provider', 'provider_user_id'], 'uq_oauth_provider_user');
            $table->index('user_id', 'idx_oauth_accounts_user');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oauth_accounts');
    }
};
