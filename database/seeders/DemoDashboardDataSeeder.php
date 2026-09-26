<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\ModuleItemType;
use App\Enums\QuestionType;
use App\Enums\UserRole;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\Cohort;
use App\Models\CohortCourse;
use App\Models\Course;
use App\Models\Enrolment;
use App\Models\Evaluation;
use App\Models\EvaluationAttempt;
use App\Models\Module;
use App\Models\ModuleItem;
use App\Models\Order;
use App\Models\PaymentSubmission;
use App\Models\Resource;
use App\Models\Ticket;
use App\Models\User;
use App\Services\Assessment\AssignmentSubmissionService;
use App\Services\Assessment\EvaluationAttemptService;
use App\Services\Certification\CertificateService;
use App\Services\Communication\TicketService;
use App\Services\Enrolment\CohortCourseService;
use App\Services\Enrolment\CohortService;
use App\Services\Enrolment\CourseApplicationService;
use App\Services\Enrolment\EnrolmentService;
use App\Services\Payments\PaymentSubmissionService;
use App\Services\Progress\ProgressEngine;
use App\Services\Reviews\CourseReviewService;
use App\Enums\EnrolmentSource;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;

/**
 * LOCAL-ONLY demo activity so the admin, instructor and student dashboards have realistic data
 * to design against: ~24 students at different stages of the SEO course, applications and
 * payments in every state on the paid courses, grading queues, at-risk learners, tickets and
 * reviews.
 *
 * Everything goes through the real services (EnrolmentService, ProgressEngine, submission and
 * attempt services, PaymentSubmissionService…) so rows, audit logs and engagement events look
 * exactly like real use. A fake clock (Carbon::setTestNow) places each action on a believable
 * date: enrolments in August, study through September, some students silent for 14+ days.
 *
 * Safety:
 *  - refuses to run outside APP_ENV=local;
 *  - mail, notifications and queued jobs are faked for the whole run, so no email is sent to
 *    the fake addresses and no certificate PDFs are generated/uploaded;
 *  - payment receipts point at local demo images in public/demo/receipts (not R2);
 *  - every demo account uses an @demo.resnet.test address, so the data is easy to identify.
 *
 * Idempotent in the simplest safe way: if demo students already exist it does nothing.
 *
 * Run with: php artisan db:seed --class=DemoDashboardDataSeeder
 * (run SearchEngineOptimizationContentSeeder first — the SEO course content is required).
 */
final class DemoDashboardDataSeeder extends Seeder
{
    private const EMAIL_DOMAIN = 'demo.resnet.test';

    private const STUDENTS = [
        ['Aisha', 'Nakato', 'Kampala', "Bachelor's degree", 'Marketing assistant'],
        ['Brian', 'Okello', 'Gulu', 'Diploma', 'Shop owner'],
        ['Catherine', 'Namubiru', 'Kampala', "Bachelor's degree", 'Content writer'],
        ['Daniel', 'Ssempijja', 'Entebbe', 'Certificate', 'Freelance designer'],
        ['Esther', 'Achieng', 'Jinja', "Bachelor's degree", 'Communications officer'],
        ['Frank', 'Mugisha', 'Mbarara', 'Diploma', 'Hotel front desk'],
        ['Grace', 'Atim', 'Lira', 'A-Level', 'Student'],
        ['Henry', 'Kato', 'Kampala', "Master's degree", 'Business owner'],
        ['Irene', 'Nabirye', 'Mukono', "Bachelor's degree", 'NGO programme assistant'],
        ['Joseph', 'Tumusiime', 'Kabale', 'Diploma', 'IT support technician'],
        ['Kevin', 'Ouma', 'Tororo', 'Certificate', 'Photographer'],
        ['Lydia', 'Nansubuga', 'Kampala', "Bachelor's degree", 'Sales executive'],
        ['Moses', 'Byaruhanga', 'Fort Portal', 'Diploma', 'Tour operator'],
        ['Norah', 'Akello', 'Soroti', 'A-Level', 'Student'],
        ['Patrick', 'Wasswa', 'Masaka', "Bachelor's degree", 'Accountant'],
        ['Queen', 'Nalwoga', 'Wakiso', 'Diploma', 'Boutique owner'],
        ['Ronald', 'Kizza', 'Kampala', "Bachelor's degree", 'Junior web developer'],
        ['Sarah', 'Namutebi', 'Entebbe', 'Certificate', 'Receptionist'],
        ['Timothy', 'Opio', 'Arua', 'Diploma', 'Radio presenter'],
        ['Winnie', 'Auma', 'Kampala', "Bachelor's degree", 'Digital marketing intern'],
        ['Yusuf', 'Lubega', 'Mukono', 'A-Level', 'Boda boda fleet manager'],
        ['Zainab', 'Nantongo', 'Kampala', "Bachelor's degree", 'Event planner'],
        ['Ivan', 'Mukasa', 'Jinja', 'Diploma', 'Printing business owner'],
        ['Doreen', 'Kyomuhendo', 'Hoima', "Bachelor's degree", 'Teacher'],
    ];

    /** Short answers for each SEO module quiz's short-answer question (by module order_index). */
    private const SEO_SHORT_ANSWERS = [
        1 => 'Googlebot',
        2 => 'It is the goal behind a search — what the person actually wants to find or do.',
        3 => 'A page no other page on the site links to, so users and crawlers cannot reach it through navigation.',
        4 => 'Which URL is the preferred version when several URLs show the same or very similar content.',
        5 => 'Field data comes from real Chrome users; lab data comes from a simulated test such as Lighthouse.',
        6 => 'Add original photos and real results from a project you did yourself.',
        7 => 'Something useful, like original local research or a free tool, that other sites want to cite and link to.',
        8 => 'Are we more visible, are more people visiting, and are they completing our key events?',
        9 => 'Technical, on-page, content, off-page and local.',
    ];

    private User $admin;

    private User $instructor;

    /** @var array<int, User> */
    private array $students = [];

    public function run(): void
    {
        if (! app()->environment('local')) {
            $this->command?->error('DemoDashboardDataSeeder only runs with APP_ENV=local.');

            return;
        }

        if (User::where('email', 'like', '%@'.self::EMAIL_DOMAIN)->exists()) {
            $this->command?->warn('Demo students already exist (@'.self::EMAIL_DOMAIN.') — nothing to do.');

            return;
        }

        $seo = Course::where('slug', 'search-engine-optimization')->first();
        $wordpress = Course::where('slug', 'wordpress-development')->first();
        $analytics = Course::where('slug', 'data-analytics-with-google-analytics')->first();
        $admin = User::where('role', UserRole::Admin)->orderBy('id')->first();
        $instructor = User::where('role', UserRole::Instructor)->orderBy('id')->first();

        if (! $seo || ! $wordpress || ! $analytics || ! $admin || ! $instructor || Module::where('course_id', $seo->id)->count() < 9) {
            $this->command?->error('Missing prerequisites (SEO/WordPress/Data Analytics courses with SEO content, an admin and an instructor). Run SearchEngineOptimizationContentSeeder first.');

            return;
        }

        $this->admin = $admin;
        $this->instructor = $instructor;

        // Nothing leaves the machine: no emails to fake addresses, no queued PDF/upload jobs.
        Mail::fake();
        Notification::fake();
        Queue::fake();
        Bus::fake();

        try {
            // One transaction: a failure part-way rolls everything back, so the "already
            // seeded" check above never mistakes a half-finished run for a complete one.
            DB::transaction(fn () => $this->seedAll($seo, $wordpress, $analytics, $instructor));
        } finally {
            Carbon::setTestNow();
            CarbonImmutable::setTestNow();
        }

        $this->command?->info('Demo dashboard data created for '.count($this->students).' students (@'.self::EMAIL_DOMAIN.').');
    }

    private function seedAll(Course $seo, Course $wordpress, Course $analytics, User $instructor): void
    {
        {
            $this->createStudents();
            [$september, $november] = $this->cohorts();

            $seoOffering = $this->offering($september, $seo, ['status' => 'open', 'capacity' => 30, 'primary_instructor_id' => $instructor->id]);
            $analyticsOffering = $this->offering($september, $analytics, ['status' => 'open', 'capacity' => 20, 'primary_instructor_id' => $instructor->id]);
            $wordpressOffering = $this->offering($september, $wordpress, ['status' => 'open', 'capacity' => 25]);
            $this->offering($november, $seo, ['status' => 'open', 'capacity' => 30, 'primary_instructor_id' => $instructor->id]);
            $this->offering($november, $wordpress, ['status' => 'open', 'capacity' => 25]);

            $seo->instructors()->syncWithoutDetaching([$instructor->id => ['is_primary' => true, 'assigned_at' => now()]]);

            $this->seoCohort($seo, $seoOffering);
            $this->wordpressApplications($wordpress, $wordpressOffering);
            $this->analyticsPayments($analytics, $analyticsOffering);
            $this->supportTickets($seo);
        }
    }

    // ─── Setup ──────────────────────────────────────────────────────────────────

    private function createStudents(): void
    {
        $this->at('2026-08-05 10:00', function (): void {
            foreach (self::STUDENTS as $i => [$first, $last, $city, $qualification, $occupation]) {
                $student = User::create([
                    'role' => UserRole::Student,
                    'name' => "{$first} {$last}",
                    'first_name' => $first,
                    'last_name' => $last,
                    'email' => strtolower("{$first}.{$last}").'@'.self::EMAIL_DOMAIN,
                    'password_hash' => Hash::make('password'),
                    'phone' => '+2567'.str_pad((string) (70123400 + $i * 1379), 8, '0', STR_PAD_LEFT),
                    'country' => 'Uganda',
                    'city' => $city,
                    'highest_qualification' => $qualification,
                    'occupation' => $occupation,
                    'status' => 'active',
                ]);
                $student->forceFill(['email_verified_at' => now()])->save();
                $this->students[] = $student;
            }
        });
    }

    /** @return array{0: Cohort, 1: Cohort} */
    private function cohorts(): array
    {
        $september = Cohort::where('start_date', '2026-09-01')->first();

        if (! $september) {
            $september = $this->at('2026-07-20 09:00', fn () => app(CohortService::class)->create([
                'name' => 'September 2026',
                'start_date' => '2026-09-01',
                'end_date' => '2026-10-31',
                'application_deadline' => '2026-08-20',
                'status' => 'published',
            ], $this->admin->id));
        }

        $november = Cohort::where('start_date', '2026-11-02')->first()
            ?? $this->at('2026-09-15 09:00', fn () => app(CohortService::class)->create([
                'name' => 'November 2026',
                'start_date' => '2026-11-02',
                'end_date' => '2026-12-18',
                'application_deadline' => '2026-10-23',
                'status' => 'published',
            ], $this->admin->id));

        return [$september, $november];
    }

    private function offering(Cohort $cohort, Course $course, array $data): CohortCourse
    {
        $existing = CohortCourse::where('cohort_id', $cohort->id)->where('course_id', $course->id)->first();

        if ($existing) {
            $existing->update(array_diff_key($data, ['capacity' => true]) + ['status' => 'open']);

            return $existing->fresh();
        }

        return $this->at('2026-07-25 09:00', fn () => app(CohortCourseService::class)->create($cohort->id, $course->id, $data, $this->admin->id));
    }

    // ─── SEO: a full cohort at every stage ───────────────────────────────────────

    private function seoCohort(Course $seo, CohortCourse $offering): void
    {
        $modules = Module::where('course_id', $seo->id)->orderBy('order_index')->get();
        $this->scheduleSeoLiveSessions($modules);
        $enrol = fn (User $s, string $when): Enrolment => $this->at($when, fn () => app(EnrolmentService::class)->enrol($s, $seo, EnrolmentSource::Self, $offering->id));

        // Completed the whole course → certificate, and some leave reviews.
        foreach ([0 => '2026-08-10 09:00', 1 => '2026-08-11 14:00', 2 => '2026-08-12 11:00'] as $i => $when) {
            $s = $this->students[$i];
            $enrol($s, $when);
            $day = CarbonImmutable::parse('2026-09-02 18:00')->addHours($i * 5);
            foreach ($modules as $m) {
                $this->completeModule($s, $seo, $m, $day, gradeNow: true);
                $day = $day->addDays(2);
            }
            $this->at($day->format('Y-m-d H:i'), fn () => app(CertificateService::class)->issueForCourseCompletion($s, $seo));
        }
        $this->at('2026-09-22 20:10', fn () => app(CourseReviewService::class)->submit($this->students[0], $seo, 5, 'The keyword research and technical SEO modules were exactly what I needed for my job. I audited our company site in the final project and we fixed 20 issues in two weeks.'));
        $this->at('2026-09-23 08:45', fn () => app(CourseReviewService::class)->submit($this->students[1], $seo, 4, 'Very practical. The Search Console sessions helped me understand why my shop pages were not showing on Google. I would like more examples on local SEO.'));
        $approved = $this->at('2026-09-23 12:30', fn () => app(CourseReviewService::class)->submit($this->students[2], $seo, 5, 'Clear lessons, real Ugandan examples and quick feedback on assignments. Highly recommended for anyone who writes content online.'));
        $this->at('2026-09-23 15:00', fn () => app(CourseReviewService::class)->approve($approved, $this->admin));

        // Active learners at different points; their latest work is waiting to be graded.
        $active = [3 => 5, 4 => 4, 5 => 4, 6 => 3, 7 => 3, 8 => 2];
        foreach ($active as $i => $done) {
            $s = $this->students[$i];
            $enrol($s, '2026-08-'.(13 + $i).' 10:00');
            $day = CarbonImmutable::parse('2026-09-03 19:00')->addHours($i);
            foreach ($modules->take($done) as $m) {
                $this->completeModule($s, $seo, $m, $day, gradeNow: true);
                $day = $day->addDays(3);
            }
            // Current module: resources done, assignment + quiz submitted but NOT graded yet.
            $current = $modules[$done];
            $this->completeResources($s, $seo, $current, CarbonImmutable::parse('2026-09-2'.min(5, 1 + $i % 5).' 17:00'));
            $this->submitAssignment($s, $current, CarbonImmutable::parse('2026-09-2'.min(5, 1 + $i % 5).' 21:00'), grade: false);
            if ($i % 2 === 1) {
                $this->takeQuiz($s, $current, CarbonImmutable::parse('2026-09-2'.min(5, 1 + $i % 5).' 21:40'), pass: true, grade: false);
            }
        }

        // One learner failed a quiz once and has not retried yet.
        $this->takeQuiz($this->students[8], $modules[2], CarbonImmutable::parse('2026-09-24 20:00'), pass: false, grade: true);

        // Stalled: active in the first week of the cohort, silent for 14+ days → at-risk.
        foreach ([9 => '2026-09-05 18:00', 10 => '2026-09-06 20:00', 11 => '2026-09-07 19:30', 12 => '2026-09-08 21:00'] as $i => $lastSeen) {
            $s = $this->students[$i];
            $enrol($s, '2026-08-'.(10 + $i).' 12:00');
            $this->completeResources($s, $seo, $modules[0], CarbonImmutable::parse($lastSeen), partial: $i % 2 === 0);
        }

        // Joined in the last few days — still inside the 7-day grace period.
        $enrol($this->students[13], '2026-09-22 09:15');
        $enrol($this->students[14], '2026-09-24 16:40');
        $this->completeResources($this->students[14], $seo, $modules[0], CarbonImmutable::parse('2026-09-24 19:00'), partial: true);

        // Withdrew after a week.
        $withdrawn = $enrol($this->students[15], '2026-08-25 10:00');
        $this->at('2026-09-09 11:20', fn () => app(EnrolmentService::class)->withdraw($withdrawn, $this->students[15], 'Changed jobs and no longer has evening study time.'));
    }

    /**
     * The content seeder schedules live sessions relative to the day it ran. For a believable
     * September cohort, move them onto a Mon/Wed/Fri 18:00 (EAT) timetable from 2 September —
     * all nine have happened by now — and attach a placeholder recording to each, so students
     * who study after a session can complete it by watching the recording (the app's rule).
     */
    private function scheduleSeoLiveSessions($modules): void
    {
        $days = ['2026-09-02', '2026-09-04', '2026-09-07', '2026-09-09', '2026-09-11', '2026-09-14', '2026-09-16', '2026-09-18', '2026-09-21'];

        foreach ($modules as $i => $module) {
            $item = ModuleItem::where('module_id', $module->id)->where('item_type', ModuleItemType::Resource)->get()
                ->first(fn (ModuleItem $mi) => Resource::find($mi->item_id)?->type->value === 'live_session');
            $session = $item ? Resource::find($item->item_id)?->liveSession : null;

            // 15:00 UTC = 18:00 East Africa Time.
            $session?->update([
                'scheduled_at' => $days[$i].' 15:00:00',
                'recording_url' => 'https://example.com/recordings/seo-sept-2026-module-'.$module->order_index,
            ]);
        }
    }

    // ─── WordPress: applications and payments in every state ─────────────────────

    private function wordpressApplications(Course $wordpress, CohortCourse $offering): void
    {
        $apply = fn (User $s, string $when) => $this->at($when, fn () => app(CourseApplicationService::class)->apply(
            $s, $wordpress, [], 'https://portfolio.example.com/'.strtolower($s->first_name), null, $offering->id,
        ));

        // Approved in August → enrolled with a UGX 450,000 order.
        $paid = [16 => 'full', 17 => 'partial', 18 => 'awaiting-review', 19 => 'unpaid'];
        foreach ($paid as $i => $state) {
            $application = $apply($this->students[$i], '2026-08-0'.($i - 14).' 10:00');
            $this->at('2026-08-1'.($i - 15).' 15:00', fn () => app(CourseApplicationService::class)->approve($application->id, $this->admin));
            $order = Order::where('student_id', $this->students[$i]->id)->where('course_id', $wordpress->id)->latest('id')->first();

            match ($state) {
                'full' => $this->payment($order, 450000, 1, '2026-08-28 14:32', confirm: true),
                'partial' => $this->payment($order, 200000, 2, '2026-09-03 09:30', confirm: true),
                'awaiting-review' => $this->payment($order, 450000, 1, '2026-09-23 18:10', confirm: false),
                'unpaid' => null,
            };
        }

        // Rejected (no portfolio evidence yet).
        $rejected = $apply($this->students[20], '2026-08-15 12:00');
        $this->at('2026-08-17 10:00', fn () => app(CourseApplicationService::class)->reject($rejected, $this->admin, [], 'Please complete Web Foundations first — this course assumes you can already build a basic HTML/CSS page.'));

        // Waiting for review right now.
        $apply($this->students[21], '2026-09-21 19:45');
        $apply($this->students[22], '2026-09-23 08:20');
        $apply($this->students[23], '2026-09-24 21:05');
    }

    // ─── Data Analytics (paid, advisory): payments to review ─────────────────────

    private function analyticsPayments(Course $analytics, CohortCourse $offering): void
    {
        foreach ([4 => 'full', 6 => 'awaiting-review', 10 => 'unpaid'] as $i => $state) {
            $s = $this->students[$i];
            $this->at('2026-08-2'.($i % 9).' 11:00', fn () => app(EnrolmentService::class)->enrol($s, $analytics, EnrolmentSource::Self, $offering->id));
            $order = Order::where('student_id', $s->id)->where('course_id', $analytics->id)->latest('id')->first();

            match ($state) {
                'full' => $this->payment($order, 50000, 3, '2026-09-19 17:05', confirm: true),
                'awaiting-review' => $this->payment($order, 50000, 3, '2026-09-24 12:40', confirm: false),
                'unpaid' => null,
            };
        }
    }

    // ─── Support ────────────────────────────────────────────────────────────────

    private function supportTickets(Course $seo): void
    {
        $tickets = [
            [5, '2026-09-10 20:15', 'Cannot open the Module 2 slides', 'The PowerPoint for Keyword Research shows a blank box on my phone. On my laptop it works. I use Chrome on a Tecno Spark.', 'resolved'],
            [11, '2026-09-18 09:40', 'Live session time clashes with work', 'I work until 7pm on Thursdays. Will the live session recordings be available the same night?', 'in_progress'],
            [7, '2026-09-23 22:05', 'Quiz marked my short answer wrong?', 'My answer for the Technical SEO quiz meant the same as the notes but it still shows as not graded. Can someone check?', 'open'],
            [17, '2026-09-24 13:30', 'Balance payment for WordPress course', 'I paid 200,000 on 3 September. How do I pay the remaining 250,000 with Airtel Money?', 'open'],
        ];

        foreach ($tickets as [$i, $when, $subject, $body, $status]) {
            $ticket = $this->at($when, fn () => app(TicketService::class)->create($this->students[$i], [
                'course_id' => $status === 'open' && $i === 17 ? null : $seo->id,
                'subject' => $subject,
                'body' => $body,
            ]));

            if ($status !== 'open') {
                $reply = CarbonImmutable::parse($when)->addHours(5)->format('Y-m-d H:i');
                $this->at($reply, fn () => app(TicketService::class)->reply($ticket, $this->instructor, $status === 'resolved'
                    ? 'Thanks for reporting this. Tap "Open in a new tab" under the preview — phone browsers cannot show the embedded slides. The file opens in your PowerPoint or Google Slides app.'
                    : 'Yes — every live session is recorded and the recording link is added to the session page within a few hours.'));
                $this->at($reply, fn () => app(TicketService::class)->update($ticket, ['status' => $status]));
            }
        }
    }

    // ─── Learning helpers ────────────────────────────────────────────────────────

    private function completeModule(User $s, Course $course, Module $module, CarbonImmutable $when, bool $gradeNow): void
    {
        $this->completeResources($s, $course, $module, $when);
        $this->submitAssignment($s, $module, $when->addHours(2), grade: $gradeNow);
        $this->takeQuiz($s, $module, $when->addHours(3), pass: true, grade: $gradeNow);
        $this->at($when->addHours(4)->format('Y-m-d H:i'), fn () => app(ProgressEngine::class)->evaluateCourseUnlocks($s, $course));
    }

    private function completeResources(User $s, Course $course, Module $module, CarbonImmutable $when, bool $partial = false): void
    {
        $engine = app(ProgressEngine::class);
        $this->at($when->format('Y-m-d H:i'), fn () => $engine->evaluateCourseUnlocks($s, $course));

        $items = ModuleItem::where('module_id', $module->id)->where('item_type', ModuleItemType::Resource)->orderBy('order_index')->get();
        foreach ($items->take($partial ? 2 : $items->count())->values() as $n => $item) {
            $resource = Resource::find($item->item_id);
            if (! $resource) {
                continue;
            }
            $at = $when->addMinutes(12 * ($n + 1));

            if ($resource->type->value === 'live_session') {
                $session = $resource->liveSession;
                $start = CarbonImmutable::parse($session->scheduled_at);
                // Reached the module before its session ran → attend live at the start time;
                // otherwise the session is over → watch the recording.
                $at->lessThan($start)
                    ? $this->at($start->addMinutes(4)->format('Y-m-d H:i'), fn () => $engine->joinLiveSession($s, $resource))
                    : $this->at($at->format('Y-m-d H:i'), fn () => $engine->markOpened($s, $resource));

                continue;
            }

            $this->at($at->format('Y-m-d H:i'), function () use ($engine, $s, $resource): void {
                $resource->type->value === 'document' ? $engine->markRead($s, $resource) : $engine->markOpened($s, $resource);
            });
        }
    }

    private function submitAssignment(User $s, Module $module, CarbonImmutable $when, bool $grade): void
    {
        $assignment = Assignment::where('module_id', $module->id)->first();
        if (! $assignment || AssignmentSubmission::where('assignment_id', $assignment->id)->where('student_id', $s->id)->exists()) {
            return;
        }

        $submission = $this->at($when->format('Y-m-d H:i'), fn () => app(AssignmentSubmissionService::class)->submit($s, $assignment, [
            'text_content' => "Submission for \"{$assignment->title}\".\n\nI completed each step in the brief and documented my findings with screenshots in the attached write-up. My main conclusion: the biggest opportunity for the site I chose is fixing how its most important page matches the searcher's intent, followed by the technical issues I listed in order of impact.",
        ]));

        if ($grade) {
            $score = 70 + (($s->id * 7 + $module->order_index * 3) % 28);
            $this->at($when->addDay()->format('Y-m-d H:i'), fn () => app(AssignmentSubmissionService::class)->grade($this->instructor, $submission, [
                'raw_score' => $score,
                'feedback' => $score >= 85
                    ? 'Excellent, well-evidenced work. Your prioritisation is exactly how a client would want it.'
                    : 'Good effort. Back up each recommendation with evidence (a screenshot or metric) and say why it matters for the business.',
            ]));
        }
    }

    private function takeQuiz(User $s, Module $module, CarbonImmutable $when, bool $pass, bool $grade): void
    {
        $evaluation = Evaluation::where('module_id', $module->id)->first();
        if (! $evaluation || EvaluationAttempt::where('evaluation_id', $evaluation->id)->where('student_id', $s->id)->where('passed', true)->exists()) {
            return;
        }

        $service = app(EvaluationAttemptService::class);
        $attempt = $this->at($when->format('Y-m-d H:i'), fn () => $service->start($s, $evaluation));

        $answers = [];
        $wrongLeft = $pass ? 0 : 3;
        foreach ($service->questionsFor($attempt) as $question) {
            if ($question->type === QuestionType::ShortAnswer || $question->type === QuestionType::Essay) {
                $answers[] = ['question_id' => $question->id, 'answer_text' => self::SEO_SHORT_ANSWERS[$module->order_index] ?? 'See my notes.'];

                continue;
            }
            $options = $question->options()->get();
            $pick = $wrongLeft-- > 0 ? $options->firstWhere('is_correct', false) : $options->firstWhere('is_correct', true);
            $answers[] = ['question_id' => $question->id, 'selected_option_ids' => [$pick?->id]];
        }

        $attempt = $this->at($when->addMinutes(14)->format('Y-m-d H:i'), fn () => $service->submit($attempt, $answers));

        if ($grade) {
            $manual = $attempt->answers()->with('question')->get()
                ->filter(fn ($a) => in_array($a->question->type, [QuestionType::ShortAnswer, QuestionType::Essay], true))
                ->map(fn ($a) => ['answer_id' => $a->id, 'points_awarded' => $pass ? (float) $a->question->points : 0.0])
                ->values()->all();

            if ($manual !== []) {
                $this->at($when->addHours(20)->format('Y-m-d H:i'), fn () => $service->gradeManualAnswers($this->instructor, $attempt, $manual));
            }
        }
    }

    // ─── Payments ───────────────────────────────────────────────────────────────

    private function payment(?Order $order, int $amount, int $receipt, string $when, bool $confirm): void
    {
        if (! $order) {
            return;
        }

        // Written directly rather than via PaymentSubmissionService::submit(), which uploads the
        // receipt to R2 — demo receipts are local images in public/demo/receipts instead.
        $submission = $this->at($when, fn () => PaymentSubmission::create([
            'order_id' => $order->id,
            'amount' => $amount,
            'receipt_path' => rtrim((string) config('app.url'), '/')."/demo/receipts/demo-receipt-{$receipt}.png",
            'receipt_original_name' => "momo-receipt-{$receipt}.png",
            'status' => 'pending',
        ]));

        if ($confirm) {
            $this->at(CarbonImmutable::parse($when)->addHours(6)->format('Y-m-d H:i'), fn () => app(PaymentSubmissionService::class)->confirm($submission, $this->admin));
        }
    }

    /**
     * Runs $callback with the application clock set to $when, so timestamps, audit logs and
     * engagement events carry that date.
     *
     * @template T
     *
     * @param  callable(): T  $callback
     * @return T
     */
    private function at(string $when, callable $callback): mixed
    {
        $moment = CarbonImmutable::parse($when, config('app.timezone'));
        Carbon::setTestNow($moment);
        CarbonImmutable::setTestNow($moment);

        return $callback();
    }
}
