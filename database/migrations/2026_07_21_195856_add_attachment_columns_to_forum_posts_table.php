<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Forum feed redesign: a post can optionally carry one attachment. `article` never populates
 * `attachment_path`/`attachment_original_name` — it's a long-form text mode, not a file.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('forum_posts', function (Blueprint $table): void {
            $table->enum('attachment_type', ['image', 'video', 'audio', 'article'])->nullable()->after('body');
            $table->string('attachment_path', 500)->nullable()->after('attachment_type');
            $table->string('attachment_original_name')->nullable()->after('attachment_path');
        });
    }

    public function down(): void
    {
        Schema::table('forum_posts', function (Blueprint $table): void {
            $table->dropColumn(['attachment_type', 'attachment_path', 'attachment_original_name']);
        });
    }
};
