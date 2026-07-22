<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\EnrolmentStatus;
use App\Enums\UserRole;
use App\Models\Announcement;
use App\Models\Course;
use App\Models\User;

final class AnnouncementPolicy
{
    public function viewAny(User $user, Course $course): bool
    {
        if ($user->role === UserRole::Admin || $course->isTaughtBy($user)) {
            return true;
        }

        return $user->enrolments()
            ->where('course_id', $course->id)
            ->where('status', EnrolmentStatus::Confirmed)
            ->exists();
    }

    public function create(User $user, Course $course): bool
    {
        return $user->role === UserRole::Admin || $course->isTaughtBy($user);
    }

    public function delete(User $user, Announcement $announcement): bool
    {
        return $this->create($user, $announcement->course);
    }
}
