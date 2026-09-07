<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\User;

/**
 * Browsing cohorts (index/show) stays an unauthenticated public route, same as the old
 * course-sections `public()` endpoint — so there is no `view`/`viewAny` here. Writes and the
 * cross-course cohort report are admin-only: a cohort can span courses taught by different
 * instructors, so no single instructor gets a blanket view of it.
 */
final class CohortPolicy
{
    public function create(User $user): bool
    {
        return $user->role === UserRole::Admin;
    }

    public function update(User $user): bool
    {
        return $user->role === UserRole::Admin;
    }

    public function delete(User $user): bool
    {
        return $user->role === UserRole::Admin;
    }

    public function viewAnalytics(User $user): bool
    {
        return $user->role === UserRole::Admin;
    }
}
