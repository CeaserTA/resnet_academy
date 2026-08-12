<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\ReviewStatus;
use App\Models\Course;
use App\Models\CourseReview;
use App\Models\User;
use Illuminate\Database\Seeder;

final class FeaturedReviewsSeeder extends Seeder
{
    public function run(): void
    {
        $students = User::where('role', 'student')->take(6)->get();
        $courses  = Course::take(6)->get();

        if ($students->isEmpty() || $courses->isEmpty()) {
            $this->command->warn('No students or courses found — run DatabaseSeeder first.');
            return;
        }

        $reviews = [
            [
                'rating'      => 5,
                'review_text' => 'This course completely transformed how I think about web development. The projects are real and the mentorship is unmatched. I landed a junior dev role within 3 months of completing it.',
            ],
            [
                'rating'      => 5,
                'review_text' => 'Incredibly well-structured curriculum. The instructors actually care about your progress. I had tried other platforms before but nothing came close to the depth here.',
            ],
            [
                'rating'      => 5,
                'review_text' => 'The hands-on approach makes all the difference. Theory is kept minimal and you spend most of your time building. My portfolio went from empty to impressive in just 8 weeks.',
            ],
            [
                'rating'      => 4,
                'review_text' => 'Great content and a supportive community. The live sessions were super helpful for clearing doubts. Would love to see more advanced modules added in the future.',
            ],
            [
                'rating'      => 5,
                'review_text' => 'Best investment I have made in my career. The curriculum is up to date with industry standards and the projects are things you can actually show employers.',
            ],
            [
                'rating'      => 4,
                'review_text' => 'Very practical and well paced. I appreciated that the instructors were available for questions even outside class hours. The community forum is also really active.',
            ],
        ];

        foreach ($reviews as $i => $data) {
            CourseReview::create([
                'student_id'  => $students[$i % $students->count()]->id,
                'course_id'   => $courses[$i % $courses->count()]->id,
                'rating'      => $data['rating'],
                'review_text' => $data['review_text'],
                'status'      => ReviewStatus::Approved,
                'is_featured' => true,
                'reviewed_at' => now(),
            ]);
        }

        $count = CourseReview::where('is_featured', true)->where('status', 'approved')->count();
        $this->command->info("Done — {$count} featured reviews in the database.");
    }
}
