<?php

declare(strict_types=1);

namespace App\Services\Progress;

use App\Enums\ModuleItemType;
use App\Enums\ModuleProgressStatus;
use App\Enums\ResourceProgressStatus;
use App\Enums\ResourceType;
use App\Models\AssignmentSubmission;
use App\Models\Course;
use App\Models\EvaluationAttempt;
use App\Models\LiveSessionAttendance;
use App\Models\Module;
use App\Models\ModuleItem;
use App\Models\ModuleProgress;
use App\Models\Resource;
use App\Models\ResourceProgress;
use App\Models\User;
use App\Models\VideoWatchPing;
use App\Services\Analytics\EngagementTracker;
use App\Services\Certification\CertificateService;
use App\Services\Notifications\NotificationDispatcher;
use Illuminate\Database\Eloquent\Collection;

/**
 * The single owner of "is this module complete / unlocked" (architecture.md §3). Every
 * resource-type-specific signal (video ping, mark-as-read, mark-as-opened, attendance) and
 * every assessment signal (submission, passed attempt) reports into this class; nothing else
 * computes lock or completion state independently.
 */
final class ProgressEngine
{
    public function __construct(
        private readonly CertificateService $certificateService,
        private readonly NotificationDispatcher $notificationDispatcher,
        private readonly EngagementTracker $engagementTracker,
    ) {}

    /**
     * FR-8/FR-9: a module unlocks only when its scheduled_start_at (if set) has passed AND
     * the previous applicable module is completed — both conditions, always. Run on-demand
     * (course view) and on a schedule (architecture.md §5.2), so it must be safe to call
     * repeatedly and idempotently.
     * 
     * With course sections: if student is enrolled in a section and module has unlock_offset_days,
     * use section.start_date + offset instead of scheduled_start_at.
     */
    public function evaluateCourseUnlocks(User $student, Course $course): void
    {
        // Get the student's enrollment for this course to check for section_id
        $enrolment = $course->enrolments()
            ->where('student_id', $student->id)
            ->where('status', \App\Enums\EnrolmentStatus::Confirmed)
            ->first();

        $section = $enrolment?->section;
        $previousCompleted = true;

        foreach ($this->applicableModules($student, $course) as $module) {
            $progress = ModuleProgress::firstOrCreate(
                ['student_id' => $student->id, 'module_id' => $module->id],
                ['status' => ModuleProgressStatus::Locked],
            );

            // Determine if schedule has been reached based on section vs self-paced
            $scheduleReached = $this->isModuleScheduleReached($module, $section);

            if ($progress->status === ModuleProgressStatus::Locked && $scheduleReached && $previousCompleted) {
                $progress->update([
                    'status' => ModuleProgressStatus::NotStarted,
                    'unlocked_at' => now(),
                ]);

                $this->notificationDispatcher->notifyModuleUnlocked($student, $module);
            }

            $previousCompleted = $progress->status === ModuleProgressStatus::Completed;
        }
    }

    /**
     * Determine if a module's schedule requirement has been met.
     * 
     * - If enrolled in a section AND module has unlock_offset_days: check (section.start_date + offset) <= now
     * - Otherwise: check scheduled_start_at is null or has passed
     */
    private function isModuleScheduleReached(Module $module, ?\App\Models\CourseSection $section): bool
    {
        // Section-relative scheduling takes precedence if both section and offset exist
        if ($section !== null && $module->unlock_offset_days !== null) {
            $unlockDate = $section->start_date->addDays($module->unlock_offset_days);
            return $unlockDate->isPast() || $unlockDate->isToday();
        }

        // Fall back to absolute scheduled_start_at for self-paced courses
        return $module->scheduled_start_at === null || $module->scheduled_start_at->isPast();
    }

    /**
     * FR-7: a module with no linked groups applies to every student; otherwise only students
     * in one of the linked groups see/progress through it. A module the student can't see at
     * all doesn't block their sequence, so it's excluded rather than treated as an unmet
     * predecessor.
     *
     * @return Collection<int, Module>
     */
    public function applicableModules(User $student, Course $course): Collection
    {
        return $course->modules()
            ->where(function ($query) use ($student): void {
                $query->doesntHave('groups')
                    ->orWhereHas('groups.members', fn ($q) => $q->where('users.id', $student->id));
            })
            ->orderBy('order_index')
            ->get();
    }

    /**
     * FR-13/FR-14: fired whenever a resource_progress/assignment_submissions/
     * evaluation_attempts row changes to a completing state (architecture.md §5.3). Rolls the
     * module up to completed once every *required* item is complete, then unlocks the next
     * module in sequence.
     */
    public function rollupModuleCompletion(User $student, Module $module): void
    {
        $progress = ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->first();

        if (! $progress || $progress->status === ModuleProgressStatus::Completed) {
            return;
        }

        $requiredItems = $module->items()->where('is_required', true)->get();

        $allComplete = $requiredItems->isNotEmpty()
            && $requiredItems->every(fn (ModuleItem $item) => $this->isModuleItemComplete($student, $item));

        if (! $allComplete) {
            return;
        }

        $progress->update(['status' => ModuleProgressStatus::Completed, 'completed_at' => now()]);

        $this->evaluateCourseUnlocks($student, $module->course);

        $lastModule = $this->applicableModules($student, $module->course)->last();

        if ($lastModule !== null && $lastModule->is($module)) {
            $this->certificateService->issueForCourseCompletion($student, $module->course);
        }
    }

    public function isModuleItemComplete(User $student, ModuleItem $item): bool
    {
        return match ($item->item_type) {
            ModuleItemType::Resource => $this->isResourceComplete($student, Resource::find($item->item_id)),
            ModuleItemType::Assignment => AssignmentSubmission::query()
                ->where('assignment_id', $item->item_id)
                ->where('student_id', $student->id)
                ->exists(),
            ModuleItemType::Evaluation => EvaluationAttempt::query()
                ->where('evaluation_id', $item->item_id)
                ->where('student_id', $student->id)
                ->where('passed', true)
                ->exists(),
        };
    }

    /**
     * Per-resource-type completion signal (PRD "Module completion definition"):
     *  - video: watch ≥ 90%
     *  - document/reading: "Mark as read"
     *  - external link: marked opened on click
     *  - live session: attendance recorded
     *  - SCORM/downloadable file aren't detailed by the PRD; SCORM reuses the mark-as-read
     *    signal (no in-house xAPI/SCORM runtime in this MVP) and downloadable files reuse the
     *    opened signal, both documented here rather than silently guessed at.
     */
    public function isResourceComplete(User $student, ?Resource $resource): bool
    {
        if (! $resource) {
            return false;
        }

        if ($resource->type === ResourceType::LiveSession) {
            return LiveSessionAttendance::query()
                ->where('resource_id', $resource->id)
                ->where('student_id', $student->id)
                ->where('attended', true)
                ->exists();
        }

        $progress = ResourceProgress::where('student_id', $student->id)->where('resource_id', $resource->id)->first();

        if (! $progress) {
            return false;
        }

        return match ($resource->type) {
            ResourceType::Video => (float) ($progress->watch_percent ?? 0) >= 90.0,
            ResourceType::Document, ResourceType::Reading, ResourceType::Scorm => $progress->marked_read_at !== null,
            ResourceType::ExternalLink, ResourceType::DownloadableFile => $progress->opened_at !== null,
        };
    }

    /**
     * Guards every resource-consumption action (progress pings, mark-read, etc.) — a student
     * can't record progress on a module that isn't unlocked for them yet.
     */
    public function assertModuleUnlocked(User $student, Module $module): void
    {
        $progress = ModuleProgress::where('student_id', $student->id)->where('module_id', $module->id)->first();

        abort_if(! $progress || $progress->status === ModuleProgressStatus::Locked, 403, 'This module is locked.');
    }

    public function recordVideoPing(User $student, Resource $resource, int $positionSeconds): void
    {
        $this->assertModuleUnlocked($student, $resource->module);

        VideoWatchPing::create([
            'student_id' => $student->id,
            'resource_id' => $resource->id,
            'position_seconds' => $positionSeconds,
        ]);

        $duration = $resource->video?->duration_seconds;
        $percent = $duration ? min(100.0, round($positionSeconds / $duration * 100, 2)) : 0.0;

        $progress = ResourceProgress::firstOrNew(['student_id' => $student->id, 'resource_id' => $resource->id]);
        $progress->watch_percent = max((float) ($progress->watch_percent ?? 0), $percent);
        $progress->status = $progress->watch_percent >= 90.0 ? ResourceProgressStatus::Completed : ResourceProgressStatus::InProgress;

        if ($progress->watch_percent >= 90.0 && ! $progress->completed_at) {
            $progress->completed_at = now();
        }

        $progress->save();

        $this->engagementTracker->track($student, $resource->module->course, 'resource_viewed', ['resource_id' => $resource->id, 'resource_type' => $resource->type->value]);

        $this->rollupModuleCompletion($student, $resource->module);
    }

    public function markRead(User $student, Resource $resource): void
    {
        $this->assertModuleUnlocked($student, $resource->module);

        ResourceProgress::updateOrCreate(
            ['student_id' => $student->id, 'resource_id' => $resource->id],
            ['status' => ResourceProgressStatus::Completed, 'marked_read_at' => now(), 'completed_at' => now()],
        );

        $this->engagementTracker->track($student, $resource->module->course, 'resource_viewed', ['resource_id' => $resource->id, 'resource_type' => $resource->type->value]);

        $this->rollupModuleCompletion($student, $resource->module);
    }

    public function markOpened(User $student, Resource $resource): void
    {
        $this->assertModuleUnlocked($student, $resource->module);

        ResourceProgress::updateOrCreate(
            ['student_id' => $student->id, 'resource_id' => $resource->id],
            ['status' => ResourceProgressStatus::Completed, 'opened_at' => now(), 'completed_at' => now()],
        );

        $this->engagementTracker->track($student, $resource->module->course, 'resource_viewed', ['resource_id' => $resource->id, 'resource_type' => $resource->type->value]);

        $this->rollupModuleCompletion($student, $resource->module);
    }

    public function markAttendance(User $student, Resource $resource, ?User $markedBy = null): void
    {
        $this->assertModuleUnlocked($student, $resource->module);

        LiveSessionAttendance::updateOrCreate(
            ['resource_id' => $resource->id, 'student_id' => $student->id],
            ['attended' => true, 'marked_at' => now(), 'marked_by' => $markedBy?->id],
        );

        $this->engagementTracker->track($student, $resource->module->course, 'resource_viewed', ['resource_id' => $resource->id, 'resource_type' => $resource->type->value]);

        $this->rollupModuleCompletion($student, $resource->module);
    }
}
