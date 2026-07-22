<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Assignment;
use App\Models\Course;
use App\Models\Module;
use App\Models\User;

final class AssignmentPolicy
{
    public function create(User $user, Module $module): bool
    {
        return $this->canManage($user, $module->course);
    }

    public function update(User $user, Assignment $assignment): bool
    {
        return $this->canManage($user, $assignment->module->course);
    }

    public function delete(User $user, Assignment $assignment): bool
    {
        return $this->canManage($user, $assignment->module->course);
    }

    /**
     * Instructor grading a submission (or viewing the submissions list) is the same
     * "do they teach this course" check as managing the assignment itself.
     */
    public function grade(User $user, Assignment $assignment): bool
    {
        return $this->canManage($user, $assignment->module->course);
    }

    private function canManage(User $user, Course $course): bool
    {
        return $user->role === UserRole::Admin || ($user->role === UserRole::Instructor && $course->isTaughtBy($user));
    }
}
