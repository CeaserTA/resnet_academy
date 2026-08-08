<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('course_applications', function (Blueprint $table): void {
            $table->timestamp('dismissed_at')->nullable()->after('rejection_reason');
        });
    }

    public function down(): void
    {
        Schema::table('course_applications', function (Blueprint $table): void {
            $table->dropColumn('dismissed_at');
        });
    }
};
