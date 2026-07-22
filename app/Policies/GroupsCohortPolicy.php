<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Course;
use App\Models\GroupsCohort;
use App\Models\User;

final class GroupsCohortPolicy
{
    public function create(User $user, Course $course): bool
    {
        return $this->canManage($user, $course);
    }

    public function update(User $user, GroupsCohort $group): bool
    {
        return $this->canManage($user, $group->course);
    }

    public function delete(User $user, GroupsCohort $group): bool
    {
        return $this->canManage($user, $group->course);
    }

    private function canManage(User $user, Course $course): bool
    {
        return $user->role === UserRole::Admin || ($user->role === UserRole::Instructor && $course->isTaughtBy($user));
    }
}
