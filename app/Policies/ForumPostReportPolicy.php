<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Course;
use App\Models\ForumPost;
use App\Models\User;

final class ForumPostReportPolicy
{
    public function create(User $user, ForumPost $post): bool
    {
        return app(ForumThreadPolicy::class)->view($user, $post->thread);
    }

    /**
     * The moderation queue — course-teaching instructors/admins only, never the general
     * forum audience.
     */
    public function moderate(User $user, Course $course): bool
    {
        return $user->role === UserRole::Admin || $course->isTaughtBy($user);
    }
}
