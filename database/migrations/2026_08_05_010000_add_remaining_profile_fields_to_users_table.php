<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds remaining profile fields required for Progressive Student Profile Completion feature:
     * - highest_qualification (required field for profile completion)
     * - occupation (optional profile field)
     * - linkedin_profile (optional profile field)
     * - portfolio_website (optional profile field)
     * 
     * Also adds index on phone column for performance.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            // Required field for profile completion
            $table->string('highest_qualification', 100)->nullable()->after('city');
            
            // Optional profile fields
            $table->string('occupation', 150)->nullable()->after('highest_qualification');
            $table->string('linkedin_profile', 500)->nullable()->after('occupation');
            $table->string('portfolio_website', 500)->nullable()->after('linkedin_profile');
            
            // Add index on phone for performance (queries checking profile completeness)
            $table->index('phone', 'idx_users_phone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex('idx_users_phone');
            
            $table->dropColumn([
                'highest_qualification',
                'occupation',
                'linkedin_profile',
                'portfolio_website',
            ]);
        });
    }
};
