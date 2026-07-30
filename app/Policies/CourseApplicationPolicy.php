<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\User;

final class CourseApplicationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role === UserRole::Admin;
    }

    public function approve(User $user): bool
    {
        return $user->role === UserRole::Admin;
    }

    public function reject(User $user): bool
    {
        return $user->role === UserRole::Admin;
    }
}
