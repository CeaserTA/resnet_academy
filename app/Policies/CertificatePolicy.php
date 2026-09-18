<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Certificate;
use App\Models\User;

final class CertificatePolicy
{
    public function view(User $user, Certificate $certificate): bool
    {
        return $user->role === UserRole::Admin || $user->id === $certificate->student_id;
    }

    /**
     * The cross-student certificate list is a support tool, so it is admin-only — instructors do
     * not get it even for courses they teach, since it exposes every learner's record.
     */
    public function viewAny(User $user): bool
    {
        return $user->role === UserRole::Admin;
    }

    public function regenerate(User $user, Certificate $certificate): bool
    {
        return $user->role === UserRole::Admin;
    }
}
