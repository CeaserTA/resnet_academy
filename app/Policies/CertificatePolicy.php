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
}
