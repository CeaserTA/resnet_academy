<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resource_live_sessions', function (Blueprint $table): void {
            $table->foreignId('resource_id')->primary()->constrained('resources', indexName: 'fk_rls_resource')->cascadeOnDelete();
            $table->enum('provider', ['zoom', 'google_meet']);
            $table->string('meeting_url', 500);
            $table->dateTime('scheduled_at');
            $table->unsignedInteger('duration_minutes');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resource_live_sessions');
    }
};
