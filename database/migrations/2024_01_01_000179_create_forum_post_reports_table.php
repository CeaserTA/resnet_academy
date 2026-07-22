<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('forum_post_reports', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('post_id')->constrained('forum_posts', indexName: 'fk_report_post')->cascadeOnDelete();
            $table->foreignId('reported_by')->constrained('users', indexName: 'fk_report_reporter')->cascadeOnDelete();
            $table->string('reason', 300);
            $table->enum('status', ['pending', 'reviewed', 'dismissed'])->default('pending');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('forum_post_reports');
    }
};
