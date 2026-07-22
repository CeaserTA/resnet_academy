<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\User;

final class ForumPostPolicy
{
    public function create(User $user, ForumThread $thread): bool
    {
        if ($thread->is_locked) {
            return false;
        }

        return app(ForumThreadPolicy::class)->view($user, $thread);
    }

    public function delete(User $user, ForumPost $post): bool
    {
        if ($user->id === $post->user_id) {
            return true;
        }

        $course = $post->thread->forum->course;

        return $user->role === UserRole::Admin || $course->isTaughtBy($user);
    }

    /**
     * Unlike delete, editing is author-only — staff can remove a problem post but shouldn't be
     * rewriting someone else's words.
     */
    public function update(User $user, ForumPost $post): bool
    {
        return $user->id === $post->user_id;
    }
}
