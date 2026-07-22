<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Ticket;
use App\Models\User;

final class TicketPolicy
{
    public function create(User $user): bool
    {
        return $user->role === UserRole::Student;
    }

    public function view(User $user, Ticket $ticket): bool
    {
        if ($user->role === UserRole::Admin || $user->id === $ticket->student_id || $user->id === $ticket->assigned_to) {
            return true;
        }

        return $ticket->course_id !== null && $ticket->course->isTaughtBy($user);
    }

    /**
     * Reassign/change status — narrower than view(): a course-teaching instructor who hasn't
     * been assigned can still see the ticket, but only admins and the actually-assigned or
     * course-teaching staff member can act on it.
     */
    public function manage(User $user, Ticket $ticket): bool
    {
        if ($user->role === UserRole::Admin || $user->id === $ticket->assigned_to) {
            return true;
        }

        return $ticket->course_id !== null && $ticket->course->isTaughtBy($user);
    }
}
