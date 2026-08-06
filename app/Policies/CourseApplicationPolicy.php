<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\CourseApplicationStatus;
use App\Enums\UserRole;
use App\Models\CourseApplication;
use App\Models\User;

final class CourseApplicationPolicy
{
    /**
     * Class-level gate on whether the review queue is reachable at all — per-row scoping to an
     * instructor's own courses happens in the controller, not here.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, [UserRole::Admin, UserRole::Instructor], true);
    }

    public function approve(User $user, CourseApplication $application): bool
    {
        return $this->canDecide($user, $application);
    }

    public function reject(User $user, CourseApplication $application): bool
    {
        return $this->canDecide($user, $application);
    }

    /**
     * Only the owning student, and only once rejected — pending applications aren't dismissable.
     */
    public function dismiss(User $user, CourseApplication $application): bool
    {
        return $user->id === $application->student_id && $application->status === CourseApplicationStatus::Rejected;
    }

    /**
     * Admin can decide any application; an instructor only one for a course they teach.
     */
    private function canDecide(User $user, CourseApplication $application): bool
    {
        if ($user->role === UserRole::Admin) {
            return true;
        }

        return $user->role === UserRole::Instructor
            && $application->course->instructors->contains('id', $user->id);
    }
}
