<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\CourseSection;
use App\Models\User;

final class CourseSectionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role === UserRole::Admin || $user->role === UserRole::Instructor;
    }

    public function view(User $user, CourseSection $section): bool
    {
        if ($user->role === UserRole::Admin) {
            return true;
        }

        return $user->role === UserRole::Instructor && $section->course->isTaughtBy($user);
    }

    public function create(User $user): bool
    {
        return $user->role === UserRole::Admin || $user->role === UserRole::Instructor;
    }

    public function update(User $user, CourseSection $section): bool
    {
        if ($user->role === UserRole::Admin) {
            return true;
        }

        return $user->role === UserRole::Instructor && $section->course->isTaughtBy($user);
    }

    public function delete(User $user, CourseSection $section): bool
    {
        if ($user->role === UserRole::Admin) {
            return true;
        }

        return $user->role === UserRole::Instructor && $section->course->isTaughtBy($user);
    }
}
