<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('video_watch_pings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained('users', indexName: 'fk_vwp_student')->cascadeOnDelete();
            $table->foreignId('resource_id')->constrained('resources', indexName: 'fk_vwp_resource')->cascadeOnDelete();
            $table->unsignedInteger('position_seconds');
            $table->timestamp('pinged_at')->useCurrent();
            $table->index(['student_id', 'resource_id'], 'idx_pings_student_resource');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('video_watch_pings');
    }
};
