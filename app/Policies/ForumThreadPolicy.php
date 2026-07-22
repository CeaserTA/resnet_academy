<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\EnrolmentStatus;
use App\Enums\UserRole;
use App\Models\Course;
use App\Models\ForumThread;
use App\Models\User;

final class ForumThreadPolicy
{
    /**
     * Viewing/posting in a course's forum: confirmed-enrolled students, the course's own
     * instructors, or admins — the same audience for every read/create action here.
     */
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

    public function view(User $user, ForumThread $thread): bool
    {
        return $this->viewAny($user, $thread->forum->course);
    }

    public function create(User $user, Course $course): bool
    {
        return $this->viewAny($user, $course);
    }

    /**
     * Pin/lock — moderation only, not the general forum audience.
     */
    public function moderate(User $user, ForumThread $thread): bool
    {
        $course = $thread->forum->course;

        return $user->role === UserRole::Admin || $course->isTaughtBy($user);
    }
}
