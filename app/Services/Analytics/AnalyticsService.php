<?php

declare(strict_types=1);

namespace App\Services\Analytics;

use App\Enums\EnrolmentStatus;
use App\Enums\ModuleProgressStatus;
use App\Enums\OrderStatus;
use App\Enums\TicketStatus;
use App\Enums\UserRole;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\AuditLog;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\EngagementEvent;
use App\Models\Enrolment;
use App\Models\ModuleProgress;
use App\Models\Ticket;
use App\Models\User;
use App\Services\Assessment\GradebookService;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Progress\ProgressEngine;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Business rule "Analytics dashboard": completion rates, at-risk student flags, engagement
 * metrics — mostly read-only queries over data other services already write
 * (`EngagementTracker`, `CertificateService`, `EnrolmentService`, `GradebookService`,
 * `ProgressEngine`). The one write path is `notifyAtRiskStudents()` — everything else is
 * read-only.
 */
final class AnalyticsService
{
    private const AT_RISK_INACTIVITY_DAYS = 14;

    private const AT_RISK_GRACE_PERIOD_DAYS = 7;

    private const ENGAGEMENT_WINDOW_DAYS = 30;

    public function __construct(
        private readonly GradebookService $gradebookService,
        private readonly ProgressEngine $progressEngine,
        private readonly NotificationDispatcher $notificationDispatcher,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function courseAnalytics(Course $course): array
    {
        $enrolments = Enrolment::query()
            ->where('course_id', $course->id)
            ->where('status', EnrolmentStatus::Confirmed)
            ->with('student')
            ->get();

        $totalStudents = $enrolments->count();

        $completedStudentIds = Certificate::query()
            ->where('course_id', $course->id)
            ->pluck('student_id');

        $completionRate = $totalStudents > 0
            ? round($completedStudentIds->intersect($enrolments->pluck('student_id'))->count() / $totalStudents * 100, 2)
            : 0.0;

        $lastEngagementByStudent = $this->lastEngagementByStudent($course);

        $atRiskEnrolments = $this->atRiskEnrolments($course, $enrolments, $completedStudentIds, $lastEngagementByStudent);

        $gradesByStudent = [];
        foreach ($this->gradebookService->forCourse($course)['students'] as $row) {
            $gradesByStudent[$row['student']['id']] = $row['final_grade_percent'];
        }

        $overdueAssignmentIds = Assignment::query()
            ->whereIn('module_id', $course->modules()->pluck('id'))
            ->where('due_at', '<', now())
            ->pluck('id');

        $atRiskStudents = $atRiskEnrolments
            ->map(function (Enrolment $enrolment) use ($lastEngagementByStudent, $gradesByStudent, $overdueAssignmentIds): array {
                $lastEngagedAt = $lastEngagementByStudent->get($enrolment->student_id);

                return [
                    'student' => ['id' => $enrolment->student->id, 'name' => $enrolment->student->name, 'email' => $enrolment->student->email],
                    'enrolled_at' => $enrolment->applied_at->toIso8601String(),
                    'last_engaged_at' => $lastEngagedAt ? Carbon::parse($lastEngagedAt)->toIso8601String() : null,
                    'final_grade_percent' => $gradesByStudent[$enrolment->student_id] ?? null,
                    'risk_factor' => $this->riskFactor($enrolment->student_id, $lastEngagedAt, $overdueAssignmentIds),
                ];
            })
            ->values();

        $engagementSummary = EngagementEvent::query()
            ->where('course_id', $course->id)
            ->where('created_at', '>=', Carbon::now()->subDays(self::ENGAGEMENT_WINDOW_DAYS))
            ->selectRaw('event_type, COUNT(*) as event_count')
            ->groupBy('event_type')
            ->pluck('event_count', 'event_type');

        return [
            'total_students' => $totalStudents,
            'completed_students' => $completedStudentIds->intersect($enrolments->pluck('student_id'))->count(),
            'completion_rate' => $completionRate,
            'at_risk_students' => $atRiskStudents,
            'engagement_summary' => $engagementSummary,
            'roster' => $this->roster($course, $enrolments, $completedStudentIds),
        ];
    }

    /**
     * "Send Mass Notice" — sends a real in-app reminder (`NotificationDispatcher` has no
     * email/SMS/push fan-out yet, see its own class doc) to every student currently flagged
     * at-risk by the same rule `courseAnalytics()` uses.
     */
    public function notifyAtRiskStudents(Course $course, ?string $message): int
    {
        $enrolments = Enrolment::query()
            ->where('course_id', $course->id)
            ->where('status', EnrolmentStatus::Confirmed)
            ->with('student')
            ->get();

        $completedStudentIds = Certificate::query()->where('course_id', $course->id)->pluck('student_id');
        $lastEngagementByStudent = $this->lastEngagementByStudent($course);

        $atRiskEnrolments = $this->atRiskEnrolments($course, $enrolments, $completedStudentIds, $lastEngagementByStudent);

        foreach ($atRiskEnrolments as $enrolment) {
            $this->notificationDispatcher->notifyAtRiskReminder($enrolment->student, $course, $message);
        }

        return $atRiskEnrolments->count();
    }

    /**
     * @return Collection<int|string, string>
     */
    private function lastEngagementByStudent(Course $course): Collection
    {
        return EngagementEvent::query()
            ->where('course_id', $course->id)
            ->selectRaw('student_id, MAX(created_at) as last_engaged_at')
            ->groupBy('student_id')
            ->pluck('last_engaged_at', 'student_id');
    }

    /**
     * A student is at-risk once past both the grace period (long enough ago that they should
     * have started) and the inactivity window (gone quiet long enough to be a real concern),
     * and only while not yet completed.
     *
     * @param  EloquentCollection<int, Enrolment>  $enrolments
     * @param  Collection<int, int>  $completedStudentIds
     * @param  Collection<int|string, string>  $lastEngagementByStudent
     * @return EloquentCollection<int, Enrolment>
     */
    private function atRiskEnrolments(
        Course $course,
        EloquentCollection $enrolments,
        Collection $completedStudentIds,
        Collection $lastEngagementByStudent,
    ): EloquentCollection {
        $inactivitySince = Carbon::now()->subDays(self::AT_RISK_INACTIVITY_DAYS);
        $graceCutoff = Carbon::now()->subDays(self::AT_RISK_GRACE_PERIOD_DAYS);

        return $enrolments->filter(function (Enrolment $enrolment) use ($completedStudentIds, $lastEngagementByStudent, $inactivitySince, $graceCutoff): bool {
            if ($completedStudentIds->contains($enrolment->student_id)) {
                return false;
            }

            if ($enrolment->applied_at->isAfter($graceCutoff)) {
                return false;
            }

            $lastEngagedAt = $lastEngagementByStudent->get($enrolment->student_id);

            return $lastEngagedAt === null || Carbon::parse($lastEngagedAt)->isBefore($inactivitySince);
        })->values();
    }

    /**
     * A light, real categorization from data that already exists — not a decorative label.
     *
     * @param  Collection<int, int>  $overdueAssignmentIds
     */
    private function riskFactor(int $studentId, ?string $lastEngagedAt, Collection $overdueAssignmentIds): string
    {
        if ($lastEngagedAt === null) {
            return 'No activity';
        }

        if ($overdueAssignmentIds->isNotEmpty()) {
            $submittedIds = AssignmentSubmission::query()
                ->where('student_id', $studentId)
                ->whereIn('assignment_id', $overdueAssignmentIds)
                ->pluck('assignment_id');

            if ($overdueAssignmentIds->diff($submittedIds)->isNotEmpty()) {
                return 'Assignment backlog';
            }
        }

        return 'Inactive';
    }

    /**
     * "Student Enrollment" table: every confirmed enrolment's progress, reusing
     * `ProgressEngine::applicableModules()` per student — the same per-student shape
     * `ProgressController::dashboard()` already uses for a student's own courses, just
     * iterated course→students here instead of student→courses.
     *
     * @param  EloquentCollection<int, Enrolment>  $enrolments
     * @param  Collection<int, int>  $completedStudentIds
     * @return array<int, array<string, mixed>>
     */
    private function roster(Course $course, EloquentCollection $enrolments, Collection $completedStudentIds): array
    {
        return $enrolments->map(function (Enrolment $enrolment) use ($course, $completedStudentIds): array {
            $applicableModuleIds = $this->progressEngine->applicableModules($enrolment->student, $course)->pluck('id');

            $totalCount = $applicableModuleIds->count();
            $completedCount = ModuleProgress::query()
                ->where('student_id', $enrolment->student_id)
                ->whereIn('module_id', $applicableModuleIds)
                ->where('status', ModuleProgressStatus::Completed)
                ->count();

            return [
                'student' => ['id' => $enrolment->student->id, 'name' => $enrolment->student->name, 'email' => $enrolment->student->email],
                'enrolled_at' => $enrolment->applied_at->toIso8601String(),
                'percent_complete' => $totalCount > 0 ? round($completedCount / $totalCount * 100, 2) : 0.0,
                'status' => $completedStudentIds->contains($enrolment->student_id) ? 'graduated' : 'active',
            ];
        })->values()->all();
    }

    /**
     * Admin dashboard: system-wide counts. `at_risk_students` reuses the same grace-period/
     * inactivity rule as `courseAnalytics()` but stays a count only (no per-student mapping),
     * so it's cheap even across every course at once.
     *
     * @return array<string, mixed>
     */
    public function systemSummary(): array
    {
        $enrolments = Enrolment::query()->where('status', EnrolmentStatus::Confirmed)->get();

        $completedStudentIds = Certificate::query()->pluck('student_id');

        $lastEngagementByStudent = EngagementEvent::query()
            ->selectRaw('student_id, MAX(created_at) as last_engaged_at')
            ->groupBy('student_id')
            ->pluck('last_engaged_at', 'student_id');

        $inactivitySince = Carbon::now()->subDays(self::AT_RISK_INACTIVITY_DAYS);
        $graceCutoff = Carbon::now()->subDays(self::AT_RISK_GRACE_PERIOD_DAYS);

        $atRiskCount = $enrolments
            ->filter(function (Enrolment $enrolment) use ($completedStudentIds, $lastEngagementByStudent, $inactivitySince, $graceCutoff): bool {
                if ($completedStudentIds->contains($enrolment->student_id)) {
                    return false;
                }

                if ($enrolment->applied_at->isAfter($graceCutoff)) {
                    return false;
                }

                $lastEngagedAt = $lastEngagementByStudent->get($enrolment->student_id);

                return $lastEngagedAt === null || Carbon::parse($lastEngagedAt)->isBefore($inactivitySince);
            })
            ->count();

        return [
            'students' => User::query()->where('role', UserRole::Student)->count(),
            'instructors' => User::query()->where('role', UserRole::Instructor)->count(),
            'courses_by_status' => Course::query()
                ->selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->pluck('count', 'status'),
            'confirmed_enrolments' => $enrolments->count(),
            'certificates_issued' => Certificate::query()->count(),
            'revenue_by_currency' => DB::table('orders')
                ->where('status', OrderStatus::Paid->value)
                ->selectRaw('currency, SUM(amount) as total')
                ->groupBy('currency')
                ->get()
                ->map(fn (object $row) => ['currency' => $row->currency, 'total' => (float) $row->total])
                ->values(),
            'open_tickets' => Ticket::query()->whereIn('status', [TicketStatus::Open, TicketStatus::InProgress])->count(),
            'at_risk_students' => $atRiskCount,
            'recent_audit_logs' => AuditLog::query()->with('actor')->latest('id')->limit(8)->get(),
        ];
    }
}
