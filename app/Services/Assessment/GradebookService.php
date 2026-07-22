<?php

declare(strict_types=1);

namespace App\Services\Assessment;

use App\Enums\EnrolmentStatus;
use App\Enums\EvaluationAttemptStatus;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\Course;
use App\Models\Enrolment;
use App\Models\Evaluation;
use App\Models\EvaluationAttempt;
use App\Models\User;
use Illuminate\Support\Collection;

final class GradebookService
{
    /**
     * Each evaluation is nominally weighted as 100 points (its score_percent) alongside each
     * assignment's configured max_score, since the schema has no explicit weighting field —
     * "weighting toward a final grade" (PRD) is expressed purely through max_score per
     * assignment and equal per-evaluation weight.
     */
    private const EVALUATION_WEIGHT = 100.0;

    /**
     * @return array<string, mixed>
     */
    public function forCourse(Course $course): array
    {
        $moduleIds = $course->modules()->pluck('id');

        $assignments = Assignment::query()->whereIn('module_id', $moduleIds)->get(['id', 'title', 'max_score']);
        $evaluations = Evaluation::query()->whereIn('module_id', $moduleIds)->get(['id', 'title']);

        $students = $course->enrolments()
            ->where('status', EnrolmentStatus::Confirmed)
            ->with('student')
            ->get()
            ->map(fn (Enrolment $enrolment): ?User => $enrolment->student)
            ->filter()
            ->unique('id')
            ->values();

        $studentIds = $students->pluck('id');

        $latestSubmissionsByStudent = AssignmentSubmission::query()
            ->whereIn('assignment_id', $assignments->pluck('id'))
            ->whereIn('student_id', $studentIds)
            ->whereNotNull('final_score')
            ->get()
            ->groupBy('student_id')
            ->map(fn (Collection $byStudent): Collection => $byStudent->groupBy('assignment_id')
                ->map(fn (Collection $byAssignment): AssignmentSubmission => $byAssignment->sortByDesc('attempt_number')->first()));

        $bestAttemptsByStudent = EvaluationAttempt::query()
            ->whereIn('evaluation_id', $evaluations->pluck('id'))
            ->whereIn('student_id', $studentIds)
            ->where('status', EvaluationAttemptStatus::Graded)
            ->get()
            ->groupBy('student_id')
            ->map(fn (Collection $byStudent): Collection => $byStudent->groupBy('evaluation_id')
                ->map(fn (Collection $byEvaluation): EvaluationAttempt => $byEvaluation->sortByDesc('score_percent')->first()));

        $rows = $students->map(function (User $student) use ($assignments, $evaluations, $latestSubmissionsByStudent, $bestAttemptsByStudent): array {
            /** @var Collection<int, AssignmentSubmission> $studentSubmissions */
            $studentSubmissions = $latestSubmissionsByStudent->get($student->id, collect());
            /** @var Collection<int, EvaluationAttempt> $studentAttempts */
            $studentAttempts = $bestAttemptsByStudent->get($student->id, collect());

            $assignmentScores = $assignments->map(function (Assignment $assignment) use ($studentSubmissions): array {
                $submission = $studentSubmissions->get($assignment->id);

                return [
                    'assignment_id' => $assignment->id,
                    'title' => $assignment->title,
                    'max_score' => (float) $assignment->max_score,
                    'final_score' => $submission ? (float) $submission->final_score : null,
                ];
            })->values()->all();

            $evaluationScores = $evaluations->map(function (Evaluation $evaluation) use ($studentAttempts): array {
                $attempt = $studentAttempts->get($evaluation->id);

                return [
                    'evaluation_id' => $evaluation->id,
                    'title' => $evaluation->title,
                    'best_score_percent' => $attempt ? (float) $attempt->score_percent : null,
                    'passed' => $attempt ? (bool) $attempt->passed : false,
                ];
            })->values()->all();

            $earnedPoints = collect($assignmentScores)->sum(fn (array $row) => $row['final_score'] ?? 0.0)
                + collect($evaluationScores)->sum(fn (array $row) => $row['best_score_percent'] ?? 0.0);
            $possiblePoints = collect($assignmentScores)->sum('max_score') + (count($evaluationScores) * self::EVALUATION_WEIGHT);

            return [
                'student' => ['id' => $student->id, 'name' => $student->name, 'email' => $student->email],
                'assignment_scores' => $assignmentScores,
                'evaluation_scores' => $evaluationScores,
                'final_grade_percent' => $possiblePoints > 0 ? round($earnedPoints / $possiblePoints * 100, 2) : null,
            ];
        })->values();

        return [
            'assignments' => $assignments->map(fn (Assignment $assignment): array => [
                'id' => $assignment->id,
                'title' => $assignment->title,
                'max_score' => (float) $assignment->max_score,
            ])->values(),
            'evaluations' => $evaluations->map(fn (Evaluation $evaluation): array => [
                'id' => $evaluation->id,
                'title' => $evaluation->title,
            ])->values(),
            'students' => $rows,
        ];
    }
}
