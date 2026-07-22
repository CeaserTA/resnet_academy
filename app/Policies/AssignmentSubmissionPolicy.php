<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\EnrolmentStatus;
use App\Enums\UserRole;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\User;

final class AssignmentSubmissionPolicy
{
    public function create(User $user, Assignment $assignment): bool
    {
        if ($user->role !== UserRole::Student) {
            return false;
        }

        return $user->enrolments()
            ->where('course_id', $assignment->module->course_id)
            ->where('status', EnrolmentStatus::Confirmed)
            ->exists();
    }

    public function view(User $user, AssignmentSubmission $submission): bool
    {
        if ($user->role === UserRole::Admin) {
            return true;
        }

        if ($user->id === $submission->student_id) {
            return true;
        }

        $course = $submission->assignment->module->course;

        return $user->role === UserRole::Instructor && $course->isTaughtBy($user);
    }
}
