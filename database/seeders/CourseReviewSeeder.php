<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\ReviewStatus;
use App\Enums\UserRole;
use App\Models\Course;
use App\Models\CourseReview;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Sample data for the review moderation queue and the public testimonial rail. Deliberately
 * mixed: approved/pending/rejected, featured and not, and ratings across the whole 1-5 range —
 * a table full of glowing 5-star reviews exercises neither the moderation UI nor the average
 * rating maths.
 *
 * Note this writes rows directly rather than going through CourseReviewService, which requires
 * a Certificate (the app's completion signal) before a student may review. Seeded students have
 * not completed these courses, so that path is bypassed on purpose; the rows are still valid as
 * far as the schema and every read path are concerned.
 */
final class CourseReviewSeeder extends Seeder
{
    private const REVIEWS_PER_COURSE = 8;

    /**
     * Ratings and text are paired so the sentiment matches the score.
     *
     * @var list<array{rating: int, text: string}>
     */
    private const REVIEW_POOL = [
        ['rating' => 5, 'text' => 'Easily the most practical course I have taken. Every module ends with something you actually build, so by the end you have a portfolio rather than a pile of notes.'],
        ['rating' => 5, 'text' => 'The pacing is spot on. Concepts are introduced right before you need them, which meant I never felt like I was memorising things for no reason.'],
        ['rating' => 4, 'text' => 'Really strong content overall. My only gripe is that a couple of the later videos assume you remember details from module one — a quick recap would help.'],
        ['rating' => 5, 'text' => 'I came in with almost no background and still kept up. The instructor explains the "why" behind each decision instead of just having you copy code.'],
        ['rating' => 3, 'text' => 'Solid material, but the workload is heavier than advertised. Budget more time than the course page suggests, especially for the assignments.'],
        ['rating' => 4, 'text' => 'The live sessions were the highlight for me. Being able to ask questions in real time made a big difference when I got stuck on the API module.'],
        ['rating' => 5, 'text' => 'Worth every naira. I was promoted at work about two months after finishing, and I used the final project as my talking point in the interview.'],
        ['rating' => 2, 'text' => 'The content is fine but several of the download links in module three were broken when I took it. Support fixed it eventually, but it cost me a week.'],
        ['rating' => 4, 'text' => 'Good depth without being overwhelming. I would have liked a few more worked examples on the harder topics, but the fundamentals are covered thoroughly.'],
        ['rating' => 5, 'text' => 'What sold me was the feedback on assignments. It was specific and actually pointed at what I had misunderstood rather than just giving a score.'],
        ['rating' => 3, 'text' => 'Decent introduction, though it stays fairly surface level toward the end. Great as a starting point, less so if you already have some experience.'],
        ['rating' => 5, 'text' => 'The structure is what makes this work. Each module builds on the last in a way that made the difficult parts feel inevitable rather than sudden.'],
        ['rating' => 4, 'text' => 'Very well put together. The quizzes are harder than I expected, which I ended up appreciating because they exposed the gaps in what I thought I knew.'],
        ['rating' => 5, 'text' => 'I have tried self-teaching this material twice before and bounced off both times. Having a clear sequence and deadlines is what finally got me through it.'],
        ['rating' => 1, 'text' => 'Not what I expected from the description. I was hoping for something more advanced and spent most of the course on material I already knew.'],
        ['rating' => 4, 'text' => 'The instructor clearly does this work professionally — the practical asides about what actually happens on real projects were the most valuable part for me.'],
        ['rating' => 5, 'text' => 'Excellent course. The reading material is concise and the slides are genuinely useful to go back to, which is rare.'],
        ['rating' => 3, 'text' => 'Mixed feelings. The teaching is good but the platform logged me out a few times mid-session and I lost some progress. Content is worth it regardless.'],
        ['rating' => 5, 'text' => 'Finished it over about six weeks alongside a full time job and it was manageable. The modules are sized sensibly for evening study.'],
        ['rating' => 4, 'text' => 'Would recommend. Be prepared to actually do the assignments though — skimming the videos alone will not get you through the evaluations.'],
        ['rating' => 5, 'text' => 'The best part is that nothing is hand-waved. When something is complicated, the course says so and then walks through it properly.'],
        ['rating' => 2, 'text' => 'The material is reasonable but grading took a long time on my cohort, which held up my progress through the later modules.'],
        ['rating' => 4, 'text' => 'Strong practical focus and a helpful community. Docked a star only because I would have liked more coverage of testing.'],
        ['rating' => 5, 'text' => 'Genuinely changed how I approach my work. I now reach for patterns from this course almost every week.'],
        ['rating' => 3, 'text' => 'Good value for the price. Some sections feel rushed compared to others, so the quality is a little uneven across modules.'],
        ['rating' => 5, 'text' => 'The assignments mirror real tasks closely enough that I reused two of them nearly as-is at work. Hard to ask for more than that.'],
        ['rating' => 4, 'text' => 'Clear explanations and a sensible order of topics. The live session recordings being available afterwards was a big help with my schedule.'],
        ['rating' => 5, 'text' => 'I appreciated how much emphasis was placed on understanding errors rather than avoiding them. It made me a lot more confident debugging on my own.'],
    ];

    /** Rejected reviews carry an internal note explaining why — never shown to the student. */
    private const REJECTION_NOTES = [
        'Duplicate of an earlier submission from the same student.',
        'Feedback is about a billing issue, not the course content — redirected to support.',
        'Contains contact details; asked the student to resubmit without them.',
    ];

    public function run(): void
    {
        $students = User::query()->where('role', UserRole::Student)->get();
        $courses = Course::query()->get();
        $admin = User::query()->where('role', UserRole::Admin)->first();

        if ($students->isEmpty() || $courses->isEmpty()) {
            $this->command->warn('No students or courses found — run DatabaseSeeder first.');

            return;
        }

        $created = 0;
        $skipped = 0;
        $rejectionIndex = 0;

        foreach ($courses->values() as $courseIndex => $course) {
            // Offsetting per course keeps any single course from showing the same few comments,
            // and stops every course sharing an identical review list.
            $poolOffset = $courseIndex * 5;
            $studentOffset = $courseIndex * 3;

            $perCourse = min(self::REVIEWS_PER_COURSE, $students->count());

            for ($i = 0; $i < $perCourse; $i++) {
                $student = $students[($studentOffset + $i) % $students->count()];

                // One review per student per course (uq_course_review_student_course), so a
                // re-run — or a pair that already reviewed for real — is skipped, not collided.
                $alreadyReviewed = CourseReview::query()
                    ->where('student_id', $student->id)
                    ->where('course_id', $course->id)
                    ->exists();

                if ($alreadyReviewed) {
                    $skipped++;

                    continue;
                }

                $entry = self::REVIEW_POOL[($poolOffset + $i) % count(self::REVIEW_POOL)];
                $status = $this->statusFor($i);

                $attributes = [
                    'student_id' => $student->id,
                    'course_id' => $course->id,
                    'rating' => $entry['rating'],
                    'review_text' => $entry['text'],
                    'status' => $status,
                    // Featured is a shop-window flag: only ever on approved, well-rated reviews.
                    'is_featured' => $status === ReviewStatus::Approved && $entry['rating'] >= 4 && $i % 4 === 0,
                ];

                if ($status !== ReviewStatus::Pending) {
                    // Pending reviews have not been looked at yet, so they carry no reviewer.
                    $attributes['reviewed_by'] = $admin?->id;
                    $attributes['reviewed_at'] = now()->subDays(random_int(1, 45));
                }

                if ($status === ReviewStatus::Rejected) {
                    $attributes['admin_notes'] = self::REJECTION_NOTES[$rejectionIndex % count(self::REJECTION_NOTES)];
                    $rejectionIndex++;
                }

                CourseReview::create($attributes);
                $created++;
            }
        }

        $this->command->info("Seeded {$created} course reviews ({$skipped} skipped — already reviewed).");
        $this->command->info(sprintf(
            'Totals — approved: %d, pending: %d, rejected: %d, featured: %d.',
            CourseReview::where('status', ReviewStatus::Approved)->count(),
            CourseReview::where('status', ReviewStatus::Pending)->count(),
            CourseReview::where('status', ReviewStatus::Rejected)->count(),
            CourseReview::where('is_featured', true)->count(),
        ));
    }

    /**
     * 5 approved : 2 pending : 1 rejected per course, so the moderation queue always has
     * something waiting in it and the public rail always has something to show. The modulus
     * matches REVIEWS_PER_COURSE so every bucket is actually reachable.
     */
    private function statusFor(int $index): ReviewStatus
    {
        return match ($index % self::REVIEWS_PER_COURSE) {
            5, 6 => ReviewStatus::Pending,
            7 => ReviewStatus::Rejected,
            default => ReviewStatus::Approved,
        };
    }
}
