<?php

declare(strict_types=1);

namespace App\Services\Assessment;

use App\Enums\EvaluationAttemptStatus;
use App\Enums\SubmissionStatus;
use App\Enums\UserRole;
use App\Models\AssignmentSubmission;
use App\Models\Course;
use App\Models\EvaluationAttempt;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Everything handed in that still needs a mark, across the courses a staff member can grade:
 * assignment submissions in `submitted` status and evaluation attempts in `submitted` status
 * (written answers waiting for manual marking). Admins see every course; instructors only the
 * courses they teach. Oldest first, so nobody waits longest.
 *
 * One query per kind instead of one request per assignment/quiz from the browser.
 */
final class GradingQueueService
{
    /**
     * @return list<array<string, mixed>>
     */
    public function forUser(User $user, ?int $courseId = null): array
    {
        $courseIds = $this->gradableCourseIds($user, $courseId);

        $inCourses = fn (Builder $module) => $module->whereIn('course_id', $courseIds);

        $submissions = AssignmentSubmission::query()
            ->where('status', SubmissionStatus::Submitted)
            ->whereHas('assignment.module', $inCourses)
            ->with(['student:id,name,email', 'assignment.module.course:id,title'])
            ->get()
            ->map(fn (AssignmentSubmission $s): array => [
                'kind' => 'assignment',
                'id' => $s->id,
                'item_id' => $s->assignment->id,
                'item_title' => $s->assignment->title,
                'module' => ['id' => $s->assignment->module->id, 'title' => $s->assignment->module->title, 'order_index' => $s->assignment->module->order_index],
                'course' => ['id' => $s->assignment->module->course->id, 'title' => $s->assignment->module->course->title],
                'student' => $s->student ? ['id' => $s->student->id, 'name' => $s->student->name, 'email' => $s->student->email] : null,
                'attempt_number' => $s->attempt_number,
                'is_late' => (bool) $s->is_late,
                'submitted_at' => $s->submitted_at->toIso8601String(),
            ]);

        $attempts = EvaluationAttempt::query()
            ->where('status', EvaluationAttemptStatus::Submitted)
            ->whereHas('evaluation.module', $inCourses)
            ->with(['student:id,name,email', 'evaluation.module.course:id,title'])
            ->get()
            ->map(fn (EvaluationAttempt $a): array => [
                'kind' => 'quiz',
                'id' => $a->id,
                'item_id' => $a->evaluation->id,
                'item_title' => $a->evaluation->title,
                'module' => ['id' => $a->evaluation->module->id, 'title' => $a->evaluation->module->title, 'order_index' => $a->evaluation->module->order_index],
                'course' => ['id' => $a->evaluation->module->course->id, 'title' => $a->evaluation->module->course->title],
                'student' => $a->student ? ['id' => $a->student->id, 'name' => $a->student->name, 'email' => $a->student->email] : null,
                'attempt_number' => $a->attempt_number,
                'is_late' => false,
                'submitted_at' => $a->submitted_at?->toIso8601String(),
            ]);

        return $submissions->concat($attempts)
            ->sortBy('submitted_at')
            ->values()
            ->all();
    }

    /**
     * Students who used every attempt on a quiz without passing (extra attempts already granted
     * included) — they can't finish the module until staff give them another attempt
     * (BACKEND_CHANGES.md §1, §3). Auto-marked quizzes never appear in forUser(), so without this
     * nobody would notice them.
     *
     * @return list<array<string, mixed>>
     */
    public function outOfAttemptsForUser(User $user, ?int $courseId = null): array
    {
        $courseIds = $this->gradableCourseIds($user, $courseId);

        $attempts = EvaluationAttempt::query()
            ->where('status', '!=', EvaluationAttemptStatus::InProgress)
            ->whereHas('evaluation', fn (Builder $e) => $e->whereNotNull('max_attempts')
                ->whereHas('module', fn (Builder $m) => $m->whereIn('course_id', $courseIds)))
            ->with(['student:id,name,email', 'evaluation.module.course:id,title', 'evaluation.attemptAllowances'])
            ->get();

        return $attempts
            ->groupBy(fn (EvaluationAttempt $a) => "{$a->evaluation_id}:{$a->student_id}")
            ->map(function ($group): ?array {
                /** @var EvaluationAttempt $latest */
                $latest = $group->sortByDesc('attempt_number')->first();
                $evaluation = $latest->evaluation;
                $extra = (int) $evaluation->attemptAllowances->firstWhere('student_id', $latest->student_id)?->extra_attempts;
                $allowed = (int) $evaluation->max_attempts + $extra;

                // Passed, still waiting for a mark, or attempts left → not stuck.
                if ($group->contains(fn (EvaluationAttempt $a) => $a->passed === true)
                    || $group->contains(fn (EvaluationAttempt $a) => $a->status === EvaluationAttemptStatus::Submitted)
                    || $group->count() < $allowed) {
                    return null;
                }

                return [
                    'evaluation_id' => $evaluation->id,
                    'evaluation_title' => $evaluation->title,
                    'pass_score' => (float) $evaluation->pass_score,
                    'module' => ['id' => $evaluation->module->id, 'title' => $evaluation->module->title, 'order_index' => $evaluation->module->order_index],
                    'course' => ['id' => $evaluation->module->course->id, 'title' => $evaluation->module->course->title],
                    'student' => $latest->student ? ['id' => $latest->student->id, 'name' => $latest->student->name, 'email' => $latest->student->email] : null,
                    'attempts_used' => $group->count(),
                    'best_score_percent' => (float) $group->max('score_percent'),
                    'last_attempt_at' => $latest->submitted_at?->toIso8601String(),
                ];
            })
            ->filter()
            ->sortByDesc('last_attempt_at')
            ->values()
            ->all();
    }

    /**
     * @return list<int>
     */
    private function gradableCourseIds(User $user, ?int $courseId): array
    {
        $query = Course::query();

        if ($user->role !== UserRole::Admin) {
            $query->whereHas('instructors', fn (Builder $q) => $q->where('users.id', $user->id));
        }

        if ($courseId !== null) {
            $query->whereKey($courseId);
        }

        return $query->pluck('id')->all();
    }
}
