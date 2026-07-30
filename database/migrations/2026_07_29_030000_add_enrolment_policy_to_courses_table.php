<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Course enrollment gating: `enrolment_policy` decides which flow the student sees (Open =
 * today's instant self-enrol; Advisory = a confirm-and-go modal; Application = admin review via
 * `course_applications`). The other four columns configure the Advisory/Application modals per
 * course. `prerequisites_text` (already on this table) is reused as-is for Advisory's
 * prerequisites display — not duplicated here.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table): void {
            $table->enum('enrolment_policy', ['open', 'advisory', 'application'])
                ->default('open')
                ->after('level');
            $table->boolean('advisory_require_attestation')->default(false)->after('enrolment_policy');
            $table->json('application_questions')->nullable()->after('advisory_require_attestation');
            $table->boolean('application_allow_alternative_proof')->default(true)->after('application_questions');
            $table->boolean('application_require_portfolio_url')->default(false)->after('application_allow_alternative_proof');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table): void {
            $table->dropColumn([
                'enrolment_policy',
                'advisory_require_attestation',
                'application_questions',
                'application_allow_alternative_proof',
                'application_require_portfolio_url',
            ]);
        });
    }
};
