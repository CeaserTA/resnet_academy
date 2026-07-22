<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Course;
use App\Models\Module;
use App\Models\User;

final class ModulePolicy
{
    public function create(User $user, Course $course): bool
    {
        return $this->canManage($user, $course);
    }

    public function update(User $user, Module $module): bool
    {
        return $this->canManage($user, $module->course);
    }

    public function delete(User $user, Module $module): bool
    {
        return $this->canManage($user, $module->course);
    }

    private function canManage(User $user, Course $course): bool
    {
        return $user->role === UserRole::Admin || ($user->role === UserRole::Instructor && $course->isTaughtBy($user));
    }
}
