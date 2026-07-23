<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\EnrolmentSource;
use App\Enums\EnrolmentStatus;
use App\Enums\EvaluationAttemptStatus;
use App\Enums\ForumPostReportStatus;
use App\Enums\ModuleItemType;
use App\Enums\ModuleProgressStatus;
use App\Enums\OAuthProvider;
use App\Enums\OrderStatus;
use App\Enums\PaymentSubmissionStatus;
use App\Enums\QuestionType;
use App\Enums\ResourceProgressStatus;
use App\Enums\ScormStandard;
use App\Enums\SubmissionStatus;
use App\Enums\TicketStatus;
use App\Enums\UserRole;
use App\Models\Announcement;
use App\Models\Assignment;
use App\Models\AssignmentRubric;
use App\Models\AssignmentSubmission;
use App\Models\AssignmentSubmissionRubricScore;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Certificate;
use App\Models\Conversation;
use App\Models\Course;
use App\Models\CourseChangeLog;
use App\Models\EngagementEvent;
use App\Models\Enrolment;
use App\Models\Evaluation;
use App\Models\EvaluationAttempt;
use App\Models\EvaluationAttemptAnswer;
use App\Models\ForumPost;
use App\Models\ForumPostReport;
use App\Models\GroupsCohort;
use App\Models\LatePenaltyPolicy;
use App\Models\LiveSessionAttendance;
use App\Models\Message;
use App\Models\Module;
use App\Models\ModuleItem;
use App\Models\ModuleProgress;
use App\Models\Notification;
use App\Models\OauthAccount;
use App\Models\Order;
use App\Models\PaymentSubmission;
use App\Models\PlagiarismReport;
use App\Models\Question;
use App\Models\QuestionBank;
use App\Models\Resource;
use App\Models\ResourceDownloadableFile;
use App\Models\ResourceProgress;
use App\Models\ResourceScormPackage;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Models\VideoWatchPing;
use App\Services\Communication\ForumService;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection as SupportCollection;

/**
 * Demo/dev data across every table in schema.sql — roughly ten rows apiece (more where a
 * realistic scenario naturally produces more, e.g. reply posts or pivot rows). Built from the
 * existing factories where one exists; hand-assembled with the model's own $fillable where it
 * doesn't (module_items, resource_progress, video_watch_pings, module_progress,
 * plagiarism_reports, evaluation_attempt_answers, assignment_submission_rubric_scores,
 * oauth_accounts, course_change_logs). Forum data goes through ForumService rather than the
 * ForumThread/ForumPost factories directly so last_activity_at/tags/notifications behave exactly
 * as they do for a real post.
 */
final class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $admins = $this->seedUsers(UserRole::Admin, 3, ['Resnet Admin' => 'admin@resnet.test']);
        $instructors = $this->seedUsers(UserRole::Instructor, 4, ['Sample Instructor' => 'instructor@resnet.test']);
        $students = $this->seedUsers(UserRole::Student, 10, ['Sample Student' => 'student@resnet.test']);
        $staff = $admins->concat($instructors);
        $allUsers = $admins->concat($instructors)->concat($students)->values();

        $this->seedOauthAccounts($allUsers);

        $categories = $this->seedCategories();
        $courses = $this->seedCourses($categories, $admins, $instructors);
        $this->seedCourseChangeLogs($courses, $staff);

        $groups = $this->seedGroupsAndMembers($courses, $students);
        $modules = $this->seedModules($courses);
        $this->seedModuleGroups($modules, $groups);

        $resources = $this->seedResources($modules);
        $this->seedLiveSessionAttendance($resources, $students);

        $policies = $this->seedLatePenaltyPolicies();
        $assignments = $this->seedAssignments($modules, $policies);
        $rubricsByAssignment = $this->seedAssignmentRubrics($assignments);
        $submissions = $this->seedAssignmentSubmissions($assignments, $students, $instructors);
        $this->seedAssignmentSubmissionRubricScores($submissions, $rubricsByAssignment);
        $this->seedPlagiarismReports($submissions);

        [$banks, $questions] = $this->seedQuestionBanksAndQuestions($courses);
        $evaluations = $this->seedEvaluations($modules);
        $this->seedEvaluationQuestions($evaluations, $questions);
        $attempts = $this->seedEvaluationAttempts($evaluations, $students);
        $this->seedEvaluationAttemptAnswers($attempts, $evaluations, $questions);

        $this->seedModuleItems($resources, $assignments, $evaluations);
        $this->seedProgressTracking($students, $resources, $modules);

        $enrolments = $this->seedEnrolments($students, $courses);
        $orders = $this->seedOrders($enrolments);
        $this->seedPaymentSubmissions($orders, $admins);
        $this->seedCertificates($enrolments);

        $this->seedMessaging($allUsers);
        $this->seedTickets($students, $staff, $courses);
        $this->seedAnnouncements($courses, $staff);
        $forumPosts = $this->seedForum($courses, $students, $instructors);

        $this->seedForumPostReports($forumPosts, $students);
        $this->seedNotifications($allUsers);
        $this->seedEngagementEvents($students, $courses);
        $this->seedAuditLogs($staff);
    }

    /**
     * @return Collection<int, User>
     */
    private function seedUsers(UserRole $role, int $total, array $fixed): Collection
    {
        $state = match ($role) {
            UserRole::Admin => 'admin',
            UserRole::Instructor => 'instructor',
            UserRole::Student => 'student',
        };

        $users = new Collection;

        foreach ($fixed as $name => $email) {
            $users->push(User::factory()->{$state}()->create(['name' => $name, 'email' => $email]));
        }

        $remaining = max(0, $total - $users->count());
        if ($remaining > 0) {
            $users = $users->concat(User::factory()->{$state}()->count($remaining)->create());
        }

        return $users->values();
    }

    private function seedOauthAccounts(Collection $users): void
    {
        $users->take(10)->each(function (User $user, int $i): void {
            OauthAccount::create([
                'user_id' => $user->id,
                'provider' => OAuthProvider::Google,
                'provider_user_id' => 'google-'.($i + 1).'-'.$user->id,
            ]);
        });
    }

    /**
     * @return Collection<int, Category>
     */
    private function seedCategories(): Collection
    {
        $fixed = Category::factory()->create(['name' => 'Web Development', 'slug' => 'web-development']);

        return (new Collection([$fixed]))->concat(Category::factory()->count(9)->create())->values();
    }

    /**
     * @return Collection<int, Course>
     */
    private function seedCourses(Collection $categories, Collection $admins, Collection $instructors): Collection
    {
        $fixed = Course::factory()->create([
            'title' => 'Introduction to Laravel',
            'slug' => 'introduction-to-laravel',
            'category_id' => $categories->first()->id,
            'price' => '150000.00',
            'created_by' => $admins->first()->id,
        ]);

        $prices = ['200000.00', '90000.00', '175000.00', '130000.00', '160000.00', '140000.00', '110000.00', '250000.00', '95000.00'];

        $courses = (new Collection([$fixed]))->concat(collect($prices)->map(fn (string $price, int $i): Course => Course::factory()->create([
            'category_id' => $categories[($i + 1) % $categories->count()]->id,
            'price' => $price,
            'created_by' => $admins[$i % $admins->count()]->id,
        ])))->values();

        $courses->each(function (Course $course, int $i) use ($instructors): void {
            $course->instructors()->attach($instructors[$i % $instructors->count()]->id, [
                'is_primary' => true,
                'assigned_at' => now(),
            ]);

            if ($i % 3 === 0) {
                $course->instructors()->attach($instructors[($i + 1) % $instructors->count()]->id, [
                    'is_primary' => false,
                    'assigned_at' => now(),
                ]);
            }
        });

        return $courses;
    }

    private function seedCourseChangeLogs(Collection $courses, Collection $staff): void
    {
        for ($i = 0; $i < 10; $i++) {
            CourseChangeLog::create([
                'course_id' => $courses[$i % $courses->count()]->id,
                'version_number' => 1 + intdiv($i, $courses->count()),
                'changed_by' => $staff[$i % $staff->count()]->id,
                'change_summary' => fake()->sentence(8),
            ]);
        }
    }

    /**
     * @return Collection<int, GroupsCohort>
     */
    private function seedGroupsAndMembers(Collection $courses, Collection $students): Collection
    {
        $groups = $courses->map(fn (Course $course): GroupsCohort => GroupsCohort::factory()->create(['course_id' => $course->id]));

        $groups->each(function (GroupsCohort $group, int $i) use ($students): void {
            $picks = [$students[$i % $students->count()], $students[($i + 1) % $students->count()], $students[($i + 2) % $students->count()]];

            foreach (array_unique(array_map(fn (User $u): int => $u->id, $picks)) as $studentId) {
                $group->members()->attach($studentId, ['added_at' => now()]);
            }
        });

        return $groups;
    }

    /**
     * @return Collection<int, Module>
     */
    private function seedModules(Collection $courses): Collection
    {
        $modules = new Collection;
        $perCourse = [2, 2, 1, 1, 1, 1, 1, 1];

        $courseIndex = 0;
        foreach ($perCourse as $count) {
            $course = $courses[$courseIndex % $courses->count()];
            for ($order = 1; $order <= $count; $order++) {
                $modules->push(Module::factory()->create([
                    'course_id' => $course->id,
                    'order_index' => $order,
                ]));
            }
            $courseIndex++;
        }

        return $modules;
    }

    private function seedModuleGroups(Collection $modules, Collection $groups): void
    {
        for ($i = 0; $i < 5; $i++) {
            $modules[$i]->groups()->attach($groups[$i]->id);
        }
    }

    /**
     * @return Collection<int, resource>
     */
    private function seedResources(Collection $modules): Collection
    {
        $resources = new Collection;
        $moduleCount = $modules->count();
        $i = 0;

        foreach (['video', 'video', 'video', 'document', 'document', 'reading', 'reading', 'reading', 'externalLink', 'externalLink', 'liveSession', 'liveSession'] as $state) {
            $resources->push(Resource::factory()->{$state}()->create(['module_id' => $modules[$i % $moduleCount]->id]));
            $i++;
        }

        $scormResource = Resource::factory()->create(['module_id' => $modules[$i++ % $moduleCount]->id, 'type' => 'scorm']);
        ResourceScormPackage::create([
            'resource_id' => $scormResource->id,
            'package_url' => fake()->url(),
            'standard' => ScormStandard::Scorm2004,
        ]);
        $resources->push($scormResource);

        $downloadableResource = Resource::factory()->create(['module_id' => $modules[$i % $moduleCount]->id, 'type' => 'downloadable_file']);
        ResourceDownloadableFile::create([
            'resource_id' => $downloadableResource->id,
            'file_url' => fake()->url(),
            'file_size_kb' => fake()->numberBetween(200, 5000),
        ]);
        $resources->push($downloadableResource);

        return $resources->values();
    }

    private function seedLiveSessionAttendance(Collection $resources, Collection $students): void
    {
        $liveSessions = $resources->filter(fn (Resource $r): bool => $r->type->value === 'live_session')->values();

        if ($liveSessions->isEmpty()) {
            return;
        }

        for ($i = 0; $i < 10; $i++) {
            LiveSessionAttendance::create([
                'resource_id' => $liveSessions[$i % $liveSessions->count()]->id,
                'student_id' => $students[$i % $students->count()]->id,
                'attended' => $i % 4 !== 0,
                'marked_at' => now(),
            ]);
        }
    }

    /**
     * @return Collection<int, LatePenaltyPolicy>
     */
    private function seedLatePenaltyPolicies(): Collection
    {
        $fixed = LatePenaltyPolicy::factory()->create(['name' => 'Standard Late Policy']);
        $fixed->tiers()->createMany([
            ['hours_late_from' => 0, 'hours_late_to' => 24, 'penalty_percent' => 10],
            ['hours_late_from' => 24, 'hours_late_to' => 48, 'penalty_percent' => 25],
            ['hours_late_from' => 48, 'hours_late_to' => null, 'penalty_percent' => 50],
        ]);

        $policies = (new Collection([$fixed]))->concat(LatePenaltyPolicy::factory()->count(9)->create())->values();

        foreach ([1, 2] as $idx) {
            $policies[$idx]->tiers()->createMany([
                ['hours_late_from' => 0, 'hours_late_to' => 12, 'penalty_percent' => 5],
                ['hours_late_from' => 12, 'hours_late_to' => 36, 'penalty_percent' => 20],
                ['hours_late_from' => 36, 'hours_late_to' => null, 'penalty_percent' => 40],
            ]);
        }

        return $policies;
    }

    /**
     * @return Collection<int, Assignment>
     */
    private function seedAssignments(Collection $modules, Collection $policies): Collection
    {
        return (new Collection(range(0, 9)))->map(fn (int $i): Assignment => Assignment::factory()->create([
            'module_id' => $modules[$i % $modules->count()]->id,
            'late_penalty_policy_id' => $i % 2 === 0 ? $policies[$i % $policies->count()]->id : null,
            'plagiarism_check_enabled' => $i % 3 === 0,
        ]))->values();
    }

    /**
     * @return SupportCollection<int, Collection<int, AssignmentRubric>>
     */
    private function seedAssignmentRubrics(Collection $assignments): SupportCollection
    {
        $rubricsByAssignment = collect();

        foreach ($assignments->take(4) as $assignment) {
            $rubrics = collect(['Clarity', 'Correctness', 'Presentation'])->map(
                fn (string $criterion, int $order): AssignmentRubric => AssignmentRubric::factory()->create([
                    'assignment_id' => $assignment->id,
                    'criterion' => $criterion,
                    'max_points' => 10,
                    'order_index' => $order + 1,
                ]),
            );
            $rubricsByAssignment->put($assignment->id, $rubrics);
        }

        return $rubricsByAssignment;
    }

    /**
     * @return Collection<int, AssignmentSubmission>
     */
    private function seedAssignmentSubmissions(Collection $assignments, Collection $students, Collection $instructors): Collection
    {
        return (new Collection(range(0, 9)))->map(function (int $i) use ($assignments, $students, $instructors): AssignmentSubmission {
            $graded = $i % 2 === 0;

            return AssignmentSubmission::factory()->create([
                'assignment_id' => $assignments[$i % $assignments->count()]->id,
                'student_id' => $students[$i % $students->count()]->id,
                'status' => $graded ? SubmissionStatus::Graded : SubmissionStatus::Submitted,
                'raw_score' => $graded ? fake()->randomFloat(2, 60, 100) : null,
                'final_score' => $graded ? fake()->randomFloat(2, 55, 100) : null,
                'feedback' => $graded ? fake()->sentence(10) : null,
                'graded_by' => $graded ? $instructors[$i % $instructors->count()]->id : null,
                'graded_at' => $graded ? now() : null,
            ]);
        })->values();
    }

    private function seedAssignmentSubmissionRubricScores(Collection $submissions, SupportCollection $rubricsByAssignment): void
    {
        foreach ($submissions as $submission) {
            $rubrics = $rubricsByAssignment->get($submission->assignment_id);
            if ($rubrics === null) {
                continue;
            }

            foreach ($rubrics as $rubric) {
                AssignmentSubmissionRubricScore::create([
                    'submission_id' => $submission->id,
                    'rubric_id' => $rubric->id,
                    'score' => fake()->randomFloat(2, 5, 10),
                    'comment' => fake()->sentence(6),
                ]);
            }
        }
    }

    private function seedPlagiarismReports(Collection $submissions): void
    {
        foreach ($submissions->take(8) as $submission) {
            PlagiarismReport::create([
                'submission_id' => $submission->id,
                'similarity_score' => fake()->randomFloat(2, 0, 40),
                'report_url' => fake()->url(),
                'checked_at' => now(),
            ]);
        }
    }

    /**
     * @return array{0: Collection<int, QuestionBank>, 1: Collection<int, Question>}
     */
    private function seedQuestionBanksAndQuestions(Collection $courses): array
    {
        $banks = $courses->map(fn (Course $course): QuestionBank => QuestionBank::factory()->create(['course_id' => $course->id]));

        $types = [QuestionType::McqSingle, QuestionType::McqMulti, QuestionType::TrueFalse, QuestionType::ShortAnswer, QuestionType::Essay];

        $questions = new Collection;
        foreach ($banks as $bankIndex => $bank) {
            foreach ([0, 1] as $offset) {
                $type = $types[($bankIndex + $offset) % count($types)];
                $question = Question::factory()->create([
                    'question_bank_id' => $bank->id,
                    'type' => $type,
                    'auto_gradable' => in_array($type, [QuestionType::McqSingle, QuestionType::McqMulti, QuestionType::TrueFalse], true),
                ]);

                if ($type === QuestionType::TrueFalse) {
                    $question->options()->createMany([
                        ['option_text' => 'True', 'is_correct' => true, 'order_index' => 1],
                        ['option_text' => 'False', 'is_correct' => false, 'order_index' => 2],
                    ]);
                } elseif (in_array($type, [QuestionType::McqSingle, QuestionType::McqMulti], true)) {
                    foreach (range(1, 4) as $order) {
                        $question->options()->create([
                            'option_text' => fake()->words(2, true),
                            'is_correct' => $order === 1,
                            'order_index' => $order,
                        ]);
                    }
                }

                $questions->push($question);
            }
        }

        return [$banks->values(), $questions->values()];
    }

    /**
     * @return Collection<int, Evaluation>
     */
    private function seedEvaluations(Collection $modules): Collection
    {
        return (new Collection(range(0, 9)))->map(fn (int $i): Evaluation => Evaluation::factory()->create([
            'module_id' => $modules[$i % $modules->count()]->id,
            'max_attempts' => $i % 2 === 0 ? 3 : null,
            'time_limit_minutes' => $i % 3 === 0 ? 30 : null,
        ]))->values();
    }

    private function seedEvaluationQuestions(Collection $evaluations, Collection $questions): void
    {
        foreach ($evaluations->take(4) as $evalIndex => $evaluation) {
            $pool = $questions->slice($evalIndex * 2, 5)->values();
            if ($pool->isEmpty()) {
                $pool = $questions->take(5);
            }

            foreach ($pool as $order => $question) {
                $evaluation->questions()->attach($question->id, ['order_index' => $order + 1]);
            }
        }
    }

    /**
     * @return Collection<int, EvaluationAttempt>
     */
    private function seedEvaluationAttempts(Collection $evaluations, Collection $students): Collection
    {
        return (new Collection(range(0, 9)))->map(function (int $i) use ($evaluations, $students): EvaluationAttempt {
            $graded = $i % 3 !== 0;
            $score = $graded ? fake()->randomFloat(2, 40, 100) : null;

            return EvaluationAttempt::factory()->create([
                'evaluation_id' => $evaluations[$i % $evaluations->count()]->id,
                'student_id' => $students[$i % $students->count()]->id,
                'status' => $graded ? EvaluationAttemptStatus::Graded : EvaluationAttemptStatus::InProgress,
                'submitted_at' => $graded ? now() : null,
                'score_percent' => $score,
                'passed' => $score !== null ? $score >= 70 : null,
            ]);
        })->values();
    }

    private function seedEvaluationAttemptAnswers(Collection $attempts, Collection $evaluations, Collection $questions): void
    {
        foreach ($attempts as $i => $attempt) {
            $evaluationQuestions = $evaluations->firstWhere('id', $attempt->evaluation_id)?->questions;
            $question = ($evaluationQuestions !== null && $evaluationQuestions->isNotEmpty())
                ? $evaluationQuestions->first()
                : $questions[$i % $questions->count()];

            EvaluationAttemptAnswer::create([
                'attempt_id' => $attempt->id,
                'question_id' => $question->id,
                'selected_option_ids' => $question->options->isNotEmpty() ? [$question->options->first()->id] : null,
                'answer_text' => $question->options->isEmpty() ? fake()->sentence() : null,
                'is_correct' => $attempt->passed,
                'points_awarded' => $attempt->passed === true ? (float) $question->points : 0,
            ]);
        }
    }

    private function seedModuleItems(Collection $resources, Collection $assignments, Collection $evaluations): void
    {
        $order = 1;

        foreach ($resources->take(4) as $resource) {
            ModuleItem::create([
                'module_id' => $resource->module_id,
                'item_type' => ModuleItemType::Resource,
                'item_id' => $resource->id,
                'order_index' => $order++,
                'is_required' => true,
            ]);
        }

        foreach ($assignments->take(3) as $assignment) {
            ModuleItem::create([
                'module_id' => $assignment->module_id,
                'item_type' => ModuleItemType::Assignment,
                'item_id' => $assignment->id,
                'order_index' => $order++,
                'is_required' => true,
            ]);
        }

        foreach ($evaluations->take(3) as $evaluation) {
            ModuleItem::create([
                'module_id' => $evaluation->module_id,
                'item_type' => ModuleItemType::Evaluation,
                'item_id' => $evaluation->id,
                'order_index' => $order++,
                'is_required' => false,
            ]);
        }
    }

    private function seedProgressTracking(Collection $students, Collection $resources, Collection $modules): void
    {
        for ($i = 0; $i < 10; $i++) {
            ResourceProgress::create([
                'student_id' => $students[$i % $students->count()]->id,
                'resource_id' => $resources[$i % $resources->count()]->id,
                'status' => $i % 3 === 0 ? ResourceProgressStatus::Completed : ResourceProgressStatus::InProgress,
                'watch_percent' => $i % 3 === 0 ? 100 : fake()->randomFloat(2, 10, 80),
                'completed_at' => $i % 3 === 0 ? now() : null,
            ]);
        }

        $videoResources = $resources->filter(fn (Resource $r): bool => $r->type->value === 'video')->values();
        for ($i = 0; $i < 10 && $videoResources->isNotEmpty(); $i++) {
            VideoWatchPing::create([
                'student_id' => $students[$i % $students->count()]->id,
                'resource_id' => $videoResources[$i % $videoResources->count()]->id,
                'position_seconds' => fake()->numberBetween(10, 590),
                'pinged_at' => now(),
            ]);
        }

        $pairs = [];
        for ($i = 0; $i < 10; $i++) {
            $studentId = $students[$i % $students->count()]->id;
            $moduleId = $modules[$i % $modules->count()]->id;
            $key = $studentId.'-'.$moduleId;
            if (isset($pairs[$key])) {
                continue;
            }
            $pairs[$key] = true;

            $status = [ModuleProgressStatus::Completed, ModuleProgressStatus::InProgress, ModuleProgressStatus::NotStarted][$i % 3];
            ModuleProgress::create([
                'student_id' => $studentId,
                'module_id' => $moduleId,
                'status' => $status,
                'unlocked_at' => $status !== ModuleProgressStatus::Locked ? now()->subDays(3) : null,
                'completed_at' => $status === ModuleProgressStatus::Completed ? now() : null,
            ]);
        }
    }

    /**
     * @return Collection<int, Enrolment>
     */
    private function seedEnrolments(Collection $students, Collection $courses): Collection
    {
        $enrolments = new Collection;
        $used = [];

        for ($i = 0; $i < 10; $i++) {
            $student = $students[$i % $students->count()];
            $course = $courses[$i % $courses->count()];
            $key = $student->id.'-'.$course->id;
            if (isset($used[$key])) {
                $course = $courses[($i + 1) % $courses->count()];
            }
            $used[$student->id.'-'.$course->id] = true;

            $appliedAt = now()->subDays(10 - $i);

            $enrolments->push(Enrolment::create([
                'student_id' => $student->id,
                'course_id' => $course->id,
                'status' => EnrolmentStatus::Confirmed,
                'source' => $i % 4 === 0 ? EnrolmentSource::AdminBulk : EnrolmentSource::Self,
                'applied_at' => $appliedAt,
                'confirmation_email_due_at' => $appliedAt->clone()->addHours(24),
                'confirmation_email_sent_at' => $appliedAt->clone()->addHours(24),
            ]));
        }

        return $enrolments;
    }

    /**
     * Amount always equals the enrolled course's price (7.11's payment-flow rule: a student can
     * never owe more than what their course costs).
     *
     * @return Collection<int, Order>
     */
    private function seedOrders(Collection $enrolments): Collection
    {
        return $enrolments->map(function (Enrolment $enrolment, int $i): Order {
            $price = (float) $enrolment->course->price;
            $bucket = $i % 3;

            $amountPaid = match ($bucket) {
                0 => 0.0,
                1 => round($price / 2, 2),
                default => $price,
            };

            $status = match ($bucket) {
                0 => OrderStatus::Pending,
                1 => OrderStatus::Partial,
                default => OrderStatus::Paid,
            };

            return Order::create([
                'student_id' => $enrolment->student_id,
                'course_id' => $enrolment->course_id,
                'enrolment_id' => $enrolment->id,
                'amount' => number_format($price, 2, '.', ''),
                'amount_paid' => number_format($amountPaid, 2, '.', ''),
                'currency' => 'UGX',
                'status' => $status,
                'payment_method' => $bucket === 0 ? null : fake()->randomElement(['mobile_money', 'card', 'bank_transfer']),
                'paid_at' => $bucket === 2 ? now() : null,
            ]);
        })->values();
    }

    private function seedPaymentSubmissions(Collection $orders, Collection $admins): void
    {
        foreach ($orders as $i => $order) {
            if ($order->status === OrderStatus::Pending && $i % 2 !== 0) {
                continue;
            }

            $status = match ($order->status) {
                OrderStatus::Paid => PaymentSubmissionStatus::Confirmed,
                OrderStatus::Partial => $i % 2 === 0 ? PaymentSubmissionStatus::Confirmed : PaymentSubmissionStatus::Pending,
                OrderStatus::Pending => PaymentSubmissionStatus::Rejected,
            };

            PaymentSubmission::create([
                'order_id' => $order->id,
                'amount' => $order->status === OrderStatus::Pending ? number_format((float) $order->amount * 0.3, 2, '.', '') : $order->amount_paid,
                'receipt_path' => 'payment-receipts/seed/'.fake()->uuid().'.jpg',
                'receipt_original_name' => 'receipt.jpg',
                'status' => $status,
                'reviewed_by' => $status !== PaymentSubmissionStatus::Pending ? $admins[$i % $admins->count()]->id : null,
                'reviewed_at' => $status !== PaymentSubmissionStatus::Pending ? now() : null,
            ]);
        }
    }

    private function seedCertificates(Collection $enrolments): void
    {
        foreach ($enrolments as $enrolment) {
            Certificate::factory()->create([
                'student_id' => $enrolment->student_id,
                'course_id' => $enrolment->course_id,
                'issued_at' => now(),
            ]);
        }
    }

    private function seedMessaging(Collection $allUsers): void
    {
        for ($i = 0; $i < 10; $i++) {
            $conversation = Conversation::factory()->create();
            $participantA = $allUsers[$i % $allUsers->count()];
            $participantB = $allUsers[($i + 1) % $allUsers->count()];

            $conversation->participants()->attach([$participantA->id, $participantB->id], ['joined_at' => now()]);

            Message::factory()->create([
                'conversation_id' => $conversation->id,
                'sender_id' => $participantA->id,
                'sent_at' => now()->subHours(2),
            ]);
            Message::factory()->create([
                'conversation_id' => $conversation->id,
                'sender_id' => $participantB->id,
                'sent_at' => now()->subHour(),
                'read_at' => $i % 2 === 0 ? now() : null,
            ]);
        }
    }

    private function seedTickets(Collection $students, Collection $staff, Collection $courses): void
    {
        $statuses = [TicketStatus::Open, TicketStatus::InProgress, TicketStatus::Resolved, TicketStatus::Closed];

        for ($i = 0; $i < 10; $i++) {
            $status = $statuses[$i % count($statuses)];
            $assignee = $status !== TicketStatus::Open ? $staff[$i % $staff->count()] : null;

            $ticket = Ticket::factory()->create([
                'student_id' => $students[$i % $students->count()]->id,
                'course_id' => $i % 2 === 0 ? $courses[$i % $courses->count()]->id : null,
                'assigned_to' => $assignee?->id,
                'status' => $status,
                'resolved_at' => in_array($status, [TicketStatus::Resolved, TicketStatus::Closed], true) ? now() : null,
            ]);

            TicketMessage::factory()->create([
                'ticket_id' => $ticket->id,
                'sender_id' => $ticket->student_id,
            ]);

            if ($assignee !== null) {
                TicketMessage::factory()->create([
                    'ticket_id' => $ticket->id,
                    'sender_id' => $assignee->id,
                ]);
            }
        }
    }

    private function seedAnnouncements(Collection $courses, Collection $staff): void
    {
        for ($i = 0; $i < 10; $i++) {
            Announcement::factory()->create([
                'course_id' => $courses[$i % $courses->count()]->id,
                'posted_by' => $staff[$i % $staff->count()]->id,
            ]);
        }
    }

    /**
     * @return Collection<int, ForumPost>
     */
    private function seedForum(Collection $courses, Collection $students, Collection $instructors): Collection
    {
        $forumService = app(ForumService::class);
        $tagPool = ['general', 'help', 'feedback', 'bug', 'showcase', 'question', 'tips', 'resources', 'discussion', 'off-topic'];
        $posts = new Collection;

        for ($i = 0; $i < 10; $i++) {
            $course = $courses[$i % $courses->count()];
            $author = $students[$i % $students->count()];

            $thread = $forumService->createThread(
                $course,
                $author,
                fake()->sentence(6),
                fake()->paragraph(),
                [$tagPool[$i], $tagPool[($i + 1) % count($tagPool)]],
            );

            $posts->push($thread->headPost);

            $replier = $i % 3 === 0 ? $instructors[$i % $instructors->count()] : $students[($i + 1) % $students->count()];
            $posts->push($forumService->reply($thread, $replier, fake()->paragraph()));

            if ($i % 4 === 0) {
                $posts->push($forumService->reply($thread, $students[($i + 2) % $students->count()], fake()->paragraph()));
            }

            if ($i % 3 === 0) {
                $forumService->markThreadSolved($thread, $instructors[$i % $instructors->count()]);
            }
            if ($i % 2 === 0) {
                $thread->update(['is_pinned' => true]);
            }

            $forumService->markThreadRead($students[$i % $students->count()], $thread);
        }

        return $posts->values();
    }

    private function seedForumPostReports(Collection $posts, Collection $students): void
    {
        $statuses = [ForumPostReportStatus::Pending, ForumPostReportStatus::Reviewed, ForumPostReportStatus::Dismissed];

        for ($i = 0; $i < 10 && $posts->isNotEmpty(); $i++) {
            $post = $posts[$i % $posts->count()];
            ForumPostReport::create([
                'post_id' => $post->id,
                'reported_by' => $students[$i % $students->count()]->id,
                'reason' => fake()->sentence(6),
                'status' => $statuses[$i % count($statuses)],
            ]);
        }
    }

    private function seedNotifications(Collection $allUsers): void
    {
        $types = [
            'announcement_posted', 'course_updated', 'certificate_issued', 'new_message',
            'ticket_reply', 'forum_reply', 'forum_thread_solved', 'grade_posted', 'module_unlocked',
            'announcement_posted',
        ];

        foreach ($types as $i => $type) {
            Notification::factory()->create([
                'user_id' => $allUsers[$i % $allUsers->count()]->id,
                'type' => $type,
                'title' => fake()->sentence(5),
                'body' => fake()->sentence(12),
                'is_read' => $i % 3 === 0,
            ]);
        }
    }

    private function seedEngagementEvents(Collection $students, Collection $courses): void
    {
        $eventTypes = ['login', 'resource_viewed', 'assignment_submitted', 'quiz_attempted'];

        for ($i = 0; $i < 10; $i++) {
            EngagementEvent::create([
                'student_id' => $students[$i % $students->count()]->id,
                'course_id' => $courses[$i % $courses->count()]->id,
                'event_type' => $eventTypes[$i % count($eventTypes)],
                'event_meta' => ['seed_index' => $i],
            ]);
        }
    }

    private function seedAuditLogs(Collection $staff): void
    {
        $actions = [
            ['action' => 'enrolment.confirmed', 'entity_type' => 'enrolment'],
            ['action' => 'grade.changed', 'entity_type' => 'assignment_submission'],
            ['action' => 'user.suspended', 'entity_type' => 'user'],
            ['action' => 'order.confirmed', 'entity_type' => 'order'],
            ['action' => 'ticket.resolved', 'entity_type' => 'ticket'],
        ];

        for ($i = 0; $i < 10; $i++) {
            $entry = $actions[$i % count($actions)];
            AuditLog::create([
                'actor_id' => $staff[$i % $staff->count()]->id,
                'action' => $entry['action'],
                'entity_type' => $entry['entity_type'],
                'entity_id' => $i + 1,
                'meta' => ['seed_index' => $i],
            ]);
        }
    }
}
