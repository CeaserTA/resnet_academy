<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Course;
use App\Models\QuestionBank;
use App\Models\User;

final class QuestionBankPolicy
{
    public function viewAny(User $user, Course $course): bool
    {
        return $this->canManage($user, $course);
    }

    public function create(User $user, Course $course): bool
    {
        return $this->canManage($user, $course);
    }

    public function update(User $user, QuestionBank $bank): bool
    {
        return $this->canManage($user, $bank->course);
    }

    public function delete(User $user, QuestionBank $bank): bool
    {
        return $this->canManage($user, $bank->course);
    }

    private function canManage(User $user, Course $course): bool
    {
        return $user->role === UserRole::Admin || ($user->role === UserRole::Instructor && $course->isTaughtBy($user));
    }
}
