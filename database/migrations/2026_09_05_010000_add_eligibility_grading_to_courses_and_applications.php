<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets an Application-policy course auto-decide eligibility instead of always waiting on a
 * human reviewer. `courses.application_questions` entries gain a `correct_answer` (Yes/No) —
 * see CourseApplicationService::gradeEligibility() — and `application_pass_threshold` is the
 * minimum percentage of correct answers required to auto-qualify (null falls back to 100, i.e.
 * every question must be answered correctly).
 *
 * On `course_applications`, `eligibility_score`/`eligibility_passed` are stored for every
 * submission (including ones that don't pass) so a human reviewer sees the same context the
 * system used; `approved_automatically` distinguishes a system decision from a real reviewer
 * even though `reviewed_by` is null in both an undecided-pending row and a system approval.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table): void {
            $table->unsignedTinyInteger('application_pass_threshold')->nullable()->after('application_questions');
        });

        Schema::table('course_applications', function (Blueprint $table): void {
            $table->unsignedTinyInteger('eligibility_score')->nullable()->after('answers');
            $table->boolean('eligibility_passed')->nullable()->after('eligibility_score');
            $table->boolean('approved_automatically')->default(false)->after('reviewed_at');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table): void {
            $table->dropColumn('application_pass_threshold');
        });

        Schema::table('course_applications', function (Blueprint $table): void {
            $table->dropColumn(['eligibility_score', 'eligibility_passed', 'approved_automatically']);
        });
    }
};
