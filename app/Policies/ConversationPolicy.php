<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

final class ConversationPolicy
{
    public function view(User $user, Conversation $conversation): bool
    {
        return $conversation->participants()->where('users.id', $user->id)->exists();
    }

    /**
     * Anyone may attempt to start a conversation — the actual role-pair rule (FR-15/16/17:
     * Admin<->Instructor, Instructor<->Student, Admin<->Student; never Student<->Student, that's
     * what forums are for) is enforced by ConversationService::canConverseWith(), which needs
     * both users to evaluate, not just the actor.
     */
    public function create(User $user): bool
    {
        return true;
    }
}
