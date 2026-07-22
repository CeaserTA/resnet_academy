<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\EnrolmentStatus;
use App\Enums\UserRole;
use App\Models\Course;
use App\Models\Evaluation;
use App\Models\Module;
use App\Models\User;

final class EvaluationPolicy
{
    public function create(User $user, Module $module): bool
    {
        return $this->canManage($user, $module->course);
    }

    /**
     * Gates the full evaluation detail (questions + answer key via QuestionOptionResource) to
     * admins/instructors only — a student must never reach this, they only ever see questions
     * through the sanitized AttemptQuestionResource shape via EvaluationAttemptController.
     */
    public function view(User $user, Evaluation $evaluation): bool
    {
        return $this->canManage($user, $evaluation->module->course);
    }

    public function update(User $user, Evaluation $evaluation): bool
    {
        return $this->canManage($user, $evaluation->module->course);
    }

    public function delete(User $user, Evaluation $evaluation): bool
    {
        return $this->canManage($user, $evaluation->module->course);
    }

    public function attempt(User $user, Evaluation $evaluation): bool
    {
        if ($user->role !== UserRole::Student) {
            return false;
        }

        return $user->enrolments()
            ->where('course_id', $evaluation->module->course_id)
            ->where('status', EnrolmentStatus::Confirmed)
            ->exists();
    }

    public function grade(User $user, Evaluation $evaluation): bool
    {
        return $this->canManage($user, $evaluation->module->course);
    }

    private function canManage(User $user, Course $course): bool
    {
        return $user->role === UserRole::Admin || ($user->role === UserRole::Instructor && $course->isTaughtBy($user));
    }
}
