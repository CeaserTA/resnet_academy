<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\EnrolmentStatus;
use App\Enums\ModuleProgressStatus;
use App\Enums\ResourceType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\RecordVideoProgressRequest;
use App\Http\Resources\ModuleProgressResource;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\Enrolment;
use App\Models\LiveSessionAttendance;
use App\Models\ModuleProgress;
use App\Models\Resource;
use App\Models\User;
use App\Services\Progress\ProgressEngine;
use App\Services\Storage\MediaStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

/**
 * All writes here delegate straight to ProgressEngine (architecture.md §3) — this controller
 * only extracts the request and authenticated student, it never computes lock/completion
 * state itself.
 */
final class ProgressController extends Controller
{
    public function __construct(
        private readonly ProgressEngine $progressEngine,
        private readonly MediaStorageService $mediaStorage,
    ) {}

    /**
     * FR-13: on-demand unlock evaluation (architecture.md §5.2) plus the student's current
     * module status list — the scheduled sweep (progress:evaluate-module-unlocks) is the
     * time-based half of the same rule.
     */
    public function courseProgress(Request $request, Course $course): AnonymousResourceCollection
    {
        $student = $request->user();

        $this->progressEngine->evaluateCourseUnlocks($student, $course);

        $modules = $this->progressEngine->applicableModules($student, $course)->pluck('id');

        $progress = ModuleProgress::query()
            ->where('student_id', $student->id)
            ->whereIn('module_id', $modules)
            ->with('module')
            ->get()
            ->sortBy(fn ($p) => $p->module->order_index);

        return ModuleProgressResource::collection($progress->values());
    }

    /**
     * FR-13: one dashboard row per confirmed enrolment — course-level status/percent derived
     * from the same `module_progress` rows `courseProgress()` exposes per-course, plus the
     * certificate if the course is finished.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $student = $request->user();

        $enrolments = Enrolment::query()
            ->where('student_id', $student->id)
            ->where('status', EnrolmentStatus::Confirmed)
            ->with(['course', 'cohortCourse.cohort'])
            ->get();

        $rows = $enrolments->map(function (Enrolment $enrolment) use ($student, $request): array {
            $course = $enrolment->course;
            $applicableModuleIds = $this->progressEngine->applicableModules($student, $course)->pluck('id');

            $moduleProgress = ModuleProgress::query()
                ->where('student_id', $student->id)
                ->whereIn('module_id', $applicableModuleIds)
                ->with('module')
                ->get()
                ->sortBy(fn (ModuleProgress $progress) => $progress->module->order_index)
                ->values();

            $totalCount = $applicableModuleIds->count();
            $completedCount = $moduleProgress->where('status', ModuleProgressStatus::Completed)->count();
            $percentComplete = $totalCount > 0 ? round($completedCount / $totalCount * 100, 2) : 0.0;

            $hasAnyProgress = $moduleProgress->contains(
                fn (ModuleProgress $progress) => in_array($progress->status, [ModuleProgressStatus::InProgress, ModuleProgressStatus::Completed], true),
            );

            // The intake this student sits the course in. Its start date gates content, so the
            // dashboard reports the course as upcoming rather than showing it as startable.
            $startsOn = $enrolment->cohortCourse?->cohort?->start_date?->copy()->startOfDay();
            $hasNotStartedYet = $startsOn !== null && $startsOn->isFuture();

            $status = match (true) {
                $totalCount > 0 && $completedCount === $totalCount => 'completed',
                $hasAnyProgress => 'in_progress',
                $hasNotStartedYet => 'upcoming',
                default => 'not_started',
            };

            $certificate = Certificate::query()
                ->where('student_id', $student->id)
                ->where('course_id', $course->id)
                ->first();

            return [
                'course' => ['id' => $course->id, 'title' => $course->title],
                'status' => $status,
                'percent_complete' => $percentComplete,
                // Null for a self-paced enrolment; otherwise the day this intake's content opens.
                'starts_on' => $startsOn?->toDateString(),
                'modules' => ModuleProgressResource::collection($moduleProgress)->resolve($request),
                'certificate' => $certificate ? [
                    // id is what the client builds the download link from — that endpoint
                    // renders the PDF on demand, so the link works before the queued job runs.
                    'id' => $certificate->id,
                    'certificate_number' => $certificate->certificate_number,
                    'certificate_url' => $this->mediaStorage->url($certificate->certificate_url),
                ] : null,
            ];
        });

        return response()->json(['data' => $rows->values()]);
    }

    public function watchVideo(RecordVideoProgressRequest $request, Resource $resource): Response
    {
        $this->progressEngine->recordVideoPing($request->user(), $resource, $request->validated('position_seconds'));

        return response()->noContent();
    }

    public function markRead(Request $request, Resource $resource): Response
    {
        $this->progressEngine->markRead($request->user(), $resource);

        return response()->noContent();
    }

    public function markOpened(Request $request, Resource $resource): Response
    {
        $this->progressEngine->markOpened($request->user(), $resource);

        return response()->noContent();
    }

    /**
     * Phase 1 of verified attendance: a student is recorded as attended only by actually
     * following this link, which is also the only place the real Zoom/Meet URL is ever
     * revealed — students never see it rendered directly (see ResourceViewerPage.tsx).
     */
    public function joinLiveSession(Request $request, Resource $resource): RedirectResponse
    {
        $meetingUrl = $this->progressEngine->joinLiveSession($request->user(), $resource);

        return redirect()->away($meetingUrl);
    }

    /**
     * Business rule "Attendance tracking": the roster for a live_session resource, admin/
     * course-teaching-instructor only. Attended students are listed earliest-joined first.
     */
    public function attendanceRoster(Resource $resource): JsonResponse
    {
        $this->authorize('viewAttendance', $resource);

        abort_if($resource->type !== ResourceType::LiveSession, 422, 'Only live_session resources have an attendance roster.');

        $studentIds = $resource->module->course->enrolments()
            ->where('status', EnrolmentStatus::Confirmed)
            ->pluck('student_id');

        $attendanceByStudent = LiveSessionAttendance::query()
            ->where('resource_id', $resource->id)
            ->get()
            ->keyBy('student_id');

        $roster = User::query()->whereIn('id', $studentIds)->get()->map(function (User $student) use ($attendanceByStudent): array {
            $record = $attendanceByStudent->get($student->id);

            return [
                'student' => ['id' => $student->id, 'name' => $student->name, 'email' => $student->email],
                'attended' => $record ? (bool) $record->attended : false,
                'marked_at' => $record?->marked_at?->toIso8601String(),
            ];
        })->sortBy(fn (array $row): string => $row['attended'] ? $row['marked_at'] : '9999');

        return response()->json(['data' => $roster->values()]);
    }
}
