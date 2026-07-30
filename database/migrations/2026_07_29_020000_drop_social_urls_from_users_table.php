<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['facebook_url', 'twitter_url', 'linkedin_url', 'instagram_url']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('facebook_url', 255)->nullable()->after('tax_id');
            $table->string('twitter_url', 255)->nullable()->after('facebook_url');
            $table->string('linkedin_url', 255)->nullable()->after('twitter_url');
            $table->string('instagram_url', 255)->nullable()->after('linkedin_url');
        });
    }
};
