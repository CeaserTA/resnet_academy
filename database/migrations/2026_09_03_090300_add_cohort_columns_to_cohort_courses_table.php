<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cohort_courses', function (Blueprint $table): void {
            $table->foreignId('cohort_id')->nullable()->after('course_id')->constrained('cohorts')->cascadeOnDelete();
            $table->decimal('price_override', 10, 2)->nullable()->after('primary_instructor_id');
            $table->char('currency_override', 3)->nullable()->after('price_override');
        });
    }

    public function down(): void
    {
        Schema::table('cohort_courses', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('cohort_id');
            $table->dropColumn(['price_override', 'currency_override']);
        });
    }
};
