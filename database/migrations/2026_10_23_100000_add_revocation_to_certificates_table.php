<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets an admin withhold (revoke) an issued certificate — e.g. after a payment dispute or an
 * academic-integrity finding — and restore it later. A revoked certificate is hidden from the
 * student, can't be downloaded by them, and fails public verification. Nothing is deleted, so
 * restoring brings back the same number and PDF. See BACKEND_CHANGES.md §5.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('certificates', function (Blueprint $table): void {
            $table->timestamp('revoked_at')->nullable()->after('issued_at');
            $table->foreignId('revoked_by')->nullable()->after('revoked_at')->constrained('users')->nullOnDelete();
            $table->string('revoke_reason', 500)->nullable()->after('revoked_by');
        });
    }

    public function down(): void
    {
        Schema::table('certificates', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('revoked_by');
            $table->dropColumn(['revoked_at', 'revoke_reason']);
        });
    }
};
