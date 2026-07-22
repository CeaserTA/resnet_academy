<?php

declare(strict_types=1);

namespace App\Services\Analytics;

use App\Enums\EnrolmentStatus;
use App\Enums\OrderStatus;
use App\Enums\TicketStatus;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\EngagementEvent;
use App\Models\Enrolment;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Business rule "Analytics dashboard": completion rates, at-risk student flags, engagement
 * metrics — all read-only queries over data other services already write
 * (`EngagementTracker`, `CertificateService`, `EnrolmentService`). This class never writes.
 */
final class AnalyticsService
{
    private const AT_RISK_INACTIVITY_DAYS = 14;

    private const AT_RISK_GRACE_PERIOD_DAYS = 7;

    private const ENGAGEMENT_WINDOW_DAYS = 30;

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

        $lastEngagementByStudent = EngagementEvent::query()
            ->where('course_id', $course->id)
            ->selectRaw('student_id, MAX(created_at) as last_engaged_at')
            ->groupBy('student_id')
            ->pluck('last_engaged_at', 'student_id');

        $inactivitySince = Carbon::now()->subDays(self::AT_RISK_INACTIVITY_DAYS);
        $graceCutoff = Carbon::now()->subDays(self::AT_RISK_GRACE_PERIOD_DAYS);

        $atRiskStudents = $enrolments
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
            ->map(fn (Enrolment $enrolment) => [
                'student' => ['id' => $enrolment->student->id, 'name' => $enrolment->student->name, 'email' => $enrolment->student->email],
                'enrolled_at' => $enrolment->applied_at->toIso8601String(),
                'last_engaged_at' => ($lastEngagedAt = $lastEngagementByStudent->get($enrolment->student_id)) ? Carbon::parse($lastEngagedAt)->toIso8601String() : null,
            ])
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
        ];
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
