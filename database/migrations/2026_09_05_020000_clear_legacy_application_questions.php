<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * `application_questions` predates the Yes/No eligibility model added by the previous
 * migration — a course created before that point may still hold plain free-text question
 * strings (e.g. `["Describe your experience"]`) instead of `{text, correct_answer}` objects.
 * That legacy shape crashes CourseResource's privilege-aware serialization for public/guest
 * viewers (which maps each question to `{text: $question['text']}`), 500-ing any public
 * endpoint that includes the course — this is exactly what broke the homepage/catalogue.
 *
 * There is no way to safely infer a correct Yes/No answer for an open-ended free-text prompt,
 * so this clears any non-conforming value back to null — the admin re-authors it as a real
 * eligibility question via the course form, same as starting a brand new Application-policy
 * course from scratch.
 */
return new class extends Migration
{
    public function up(): void
    {
        $courses = DB::table('courses')->whereNotNull('application_questions')->get(['id', 'application_questions']);

        foreach ($courses as $course) {
            $questions = json_decode($course->application_questions, true);

            $isLegacyShape = is_array($questions) && collect($questions)->contains(
                fn ($question) => ! is_array($question) || ! array_key_exists('text', $question) || ! array_key_exists('correct_answer', $question),
            );

            if ($isLegacyShape) {
                DB::table('courses')->where('id', $course->id)->update(['application_questions' => null]);
            }
        }
    }

    public function down(): void
    {
        // Irreversible — the original free-text questions aren't recoverable once cleared.
    }
};
