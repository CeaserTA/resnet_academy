<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Enrolment;
use App\Models\User;

final class EnrolmentPolicy
{
    public function create(User $user): bool
    {
        return $user->role === UserRole::Student;
    }

    public function view(User $user, Enrolment $enrolment): bool
    {
        if ($user->role === UserRole::Admin) {
            return true;
        }

        return $enrolment->student_id === $user->id;
    }

    /**
     * Admin bulk/CSV import (Business rule 1) — an override path for edge cases,
     * separate from the primary self-enrolment flow.
     */
    public function import(User $user): bool
    {
        return $user->role === UserRole::Admin;
    }

    /**
     * A student dropping their own course, or an admin withdrawing them.
     */
    public function withdraw(User $user, Enrolment $enrolment): bool
    {
        return $user->role === UserRole::Admin || $enrolment->student_id === $user->id;
    }

    /**
     * Class-level gate on whether the admin roster is reachable at all — per-course scoping
     * to an instructor's own courses happens in the controller, not here.
     */
    public function viewRoster(User $user): bool
    {
        return in_array($user->role, [UserRole::Admin, UserRole::Instructor], true);
    }

    /**
     * Admin can change any enrolment; an instructor only one for a course they teach.
     */
    public function updateStatus(User $user, Enrolment $enrolment): bool
    {
        if ($user->role === UserRole::Admin) {
            return true;
        }

        return $user->role === UserRole::Instructor
            && $enrolment->course->instructors->contains('id', $user->id);
    }
}
