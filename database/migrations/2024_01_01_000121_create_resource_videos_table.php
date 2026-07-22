<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resource_videos', function (Blueprint $table): void {
            $table->foreignId('resource_id')->primary()->constrained('resources', indexName: 'fk_rv_resource')->cascadeOnDelete();
            $table->string('bunny_stream_video_id', 150);
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->string('caption_url', 500)->nullable()->comment('WCAG 2.1 AA captions');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resource_videos');
    }
};
