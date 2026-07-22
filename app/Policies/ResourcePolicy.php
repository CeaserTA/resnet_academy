<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Course;
use App\Models\Module;
use App\Models\Resource;
use App\Models\User;

final class ResourcePolicy
{
    public function create(User $user, Module $module): bool
    {
        return $this->canManage($user, $module->course);
    }

    public function update(User $user, Resource $resource): bool
    {
        return $this->canManage($user, $resource->module->course);
    }

    public function delete(User $user, Resource $resource): bool
    {
        return $this->canManage($user, $resource->module->course);
    }

    /**
     * Business rule "Attendance tracking": the roster for a live_session resource is visible
     * to the same admin/course-teaching-instructor audience as managing the resource itself.
     */
    public function viewAttendance(User $user, Resource $resource): bool
    {
        return $this->canManage($user, $resource->module->course);
    }

    private function canManage(User $user, Course $course): bool
    {
        return $user->role === UserRole::Admin || ($user->role === UserRole::Instructor && $course->isTaughtBy($user));
    }
}
