<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\EvaluationAttempt;
use App\Models\User;

final class EvaluationAttemptPolicy
{
    public function view(User $user, EvaluationAttempt $attempt): bool
    {
        if ($user->role === UserRole::Admin) {
            return true;
        }

        if ($user->id === $attempt->student_id) {
            return true;
        }

        $course = $attempt->evaluation->module->course;

        return $user->role === UserRole::Instructor && $course->isTaughtBy($user);
    }
}
