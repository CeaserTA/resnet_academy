<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Course;
use App\Models\User;

final class CoursePolicy
{
    public function create(User $user): bool
    {
        return $user->role === UserRole::Admin;
    }

    public function update(User $user, Course $course): bool
    {
        if ($user->role === UserRole::Admin) {
            return true;
        }

        return $user->role === UserRole::Instructor && $course->isTaughtBy($user);
    }

    public function delete(User $user, Course $course): bool
    {
        return $user->role === UserRole::Admin;
    }

    public function viewGradebook(User $user, Course $course): bool
    {
        if ($user->role === UserRole::Admin) {
            return true;
        }

        return $user->role === UserRole::Instructor && $course->isTaughtBy($user);
    }

    public function viewAnalytics(User $user, Course $course): bool
    {
        if ($user->role === UserRole::Admin) {
            return true;
        }

        return $user->role === UserRole::Instructor && $course->isTaughtBy($user);
    }
}
