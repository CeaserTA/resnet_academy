<?php

declare(strict_types=1);

namespace App\Services\Assessment;

use App\Enums\SubmissionStatus;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\AssignmentSubmissionRubricScore;
use App\Models\User;
use App\Services\Analytics\EngagementTracker;
use App\Services\Audit\AuditLogger;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Progress\ProgressEngine;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * FR-11: file/text submission + instructor grading with rubrics. Module completion counts on
 * *submission*, not grading (PRD "Module completion definition"), so submit() triggers the
 * Progress Engine immediately — grade() never needs to.
 */
final class AssignmentSubmissionService
{
    public function __construct(
        private readonly LatePenaltyCalculator $latePenaltyCalculator,
        private readonly ProgressEngine $progressEngine,
        private readonly NotificationDispatcher $notificationDispatcher,
        private readonly EngagementTracker $engagementTracker,
        private readonly AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array{file_url?: string, text_content?: string}  $data
     */
    public function submit(User $student, Assignment $assignment, array $data): AssignmentSubmission
    {
        $submittedAt = Carbon::now();
        $isLate = $assignment->due_at !== null && $submittedAt->greaterThan($assignment->due_at);
        $penaltyPercent = $isLate
            ? $this->latePenaltyCalculator->penaltyPercentFor($assignment->latePenaltyPolicy, $assignment->due_at, $submittedAt)
            : 0.0;

        $attemptNumber = AssignmentSubmission::query()
            ->where('assignment_id', $assignment->id)
            ->where('student_id', $student->id)
            ->max('attempt_number') + 1;

        $submission = AssignmentSubmission::create([
            'assignment_id' => $assignment->id,
            'student_id' => $student->id,
            'attempt_number' => $attemptNumber,
            'file_url' => $data['file_url'] ?? null,
            'text_content' => $data['text_content'] ?? null,
            'submitted_at' => $submittedAt,
            'is_late' => $isLate,
            'late_penalty_percent' => $penaltyPercent,
            'status' => SubmissionStatus::Submitted,
        ]);

        $this->engagementTracker->track($student, $assignment->module->course, 'assignment_submitted', ['assignment_id' => $assignment->id]);

        $this->progressEngine->rollupModuleCompletion($student, $assignment->module);

        return $submission;
    }

    /**
     * @param  array{raw_score: float, feedback?: string, rubric_scores?: array<int, array{rubric_id: int, score: float, comment?: string}>}  $data
     */
    public function grade(User $grader, AssignmentSubmission $submission, array $data): AssignmentSubmission
    {
        return DB::transaction(function () use ($grader, $submission, $data): AssignmentSubmission {
            $rawScore = (float) $data['raw_score'];
            $finalScore = round($rawScore * (1 - ((float) $submission->late_penalty_percent / 100)), 2);

            $submission->update([
                'raw_score' => $rawScore,
                'final_score' => $finalScore,
                'feedback' => $data['feedback'] ?? null,
                'status' => SubmissionStatus::Graded,
                'graded_by' => $grader->id,
                'graded_at' => now(),
            ]);

            $submission->rubricScores()->delete();

            foreach ($data['rubric_scores'] ?? [] as $rubricScore) {
                AssignmentSubmissionRubricScore::create([
                    'submission_id' => $submission->id,
                    'rubric_id' => $rubricScore['rubric_id'],
                    'score' => $rubricScore['score'],
                    'comment' => $rubricScore['comment'] ?? null,
                ]);
            }

            $this->notificationDispatcher->notifyGradePosted(
                $submission->student,
                $submission->assignment->title,
                'assignment_submission',
                $submission->id,
            );

            $this->auditLogger->log(
                action: 'grade.changed',
                entityType: 'assignment_submission',
                entityId: $submission->id,
                actorId: $grader->id,
                meta: ['raw_score' => $rawScore, 'final_score' => $finalScore],
            );

            return $submission->fresh();
        });
    }
}
