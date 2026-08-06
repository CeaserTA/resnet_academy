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
            $table->text('rejection_reason')->nullable()->after('alternative_proof_text');
        });
    }

    public function down(): void
    {
        Schema::table('course_applications', function (Blueprint $table): void {
            $table->dropColumn('rejection_reason');
        });
    }
};
