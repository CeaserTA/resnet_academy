<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\CohortCourse;
use App\Models\User;

final class CohortCoursePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role === UserRole::Admin || $user->role === UserRole::Instructor;
    }

    public function view(User $user, CohortCourse $cohortCourse): bool
    {
        if ($user->role === UserRole::Admin) {
            return true;
        }

        return $user->role === UserRole::Instructor && $cohortCourse->course->isTaughtBy($user);
    }

    public function create(User $user): bool
    {
        return $user->role === UserRole::Admin || $user->role === UserRole::Instructor;
    }

    public function update(User $user, CohortCourse $cohortCourse): bool
    {
        if ($user->role === UserRole::Admin) {
            return true;
        }

        return $user->role === UserRole::Instructor && $cohortCourse->course->isTaughtBy($user);
    }

    public function delete(User $user, CohortCourse $cohortCourse): bool
    {
        if ($user->role === UserRole::Admin) {
            return true;
        }

        return $user->role === UserRole::Instructor && $cohortCourse->course->isTaughtBy($user);
    }
}
