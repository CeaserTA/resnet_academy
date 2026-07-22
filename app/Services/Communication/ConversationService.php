<?php

declare(strict_types=1);

namespace App\Services\Communication;

use App\Enums\EnrolmentStatus;
use App\Enums\UserRole;
use App\Models\Conversation;
use App\Models\Enrolment;
use App\Models\Message;
use App\Models\User;
use App\Services\Notifications\NotificationDispatcher;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * FR-15/16/17: one generic conversations/messages system covers all three admin/instructor/
 * student pairings — schema.sql's own design note is explicit that these are "just users with
 * different roles," and that Student<->Student is deliberately excluded here (forums instead).
 * Conversations are always exactly two participants; no group messaging in this MVP.
 */
final class ConversationService
{
    public function __construct(private readonly NotificationDispatcher $notificationDispatcher) {}

    public function canConverseWith(User $a, User $b): bool
    {
        if ($a->id === $b->id) {
            return false;
        }

        $roles = [$a->role, $b->role];

        if (in_array(UserRole::Admin, $roles, true)) {
            return true;
        }

        if (in_array(UserRole::Instructor, $roles, true) && in_array(UserRole::Student, $roles, true)) {
            return $this->instructorTeachesStudent($a, $b);
        }

        return false;
    }

    /**
     * Reuses an existing 1:1 conversation between these two users instead of spawning a new
     * thread every time someone hits "message" — the pair is the identity, not the subject.
     */
    public function startOrGet(User $initiator, User $recipient, ?string $subject, string $firstMessageBody): Conversation
    {
        abort_if(! $this->canConverseWith($initiator, $recipient), 403, 'These two users are not allowed to message each other.');

        $existing = Conversation::query()
            ->whereHas('participants', fn ($query) => $query->where('users.id', $initiator->id))
            ->whereHas('participants', fn ($query) => $query->where('users.id', $recipient->id))
            ->withCount('participants')
            ->having('participants_count', 2)
            ->first();

        if ($existing) {
            $this->send($existing, $initiator, $firstMessageBody);

            return $existing;
        }

        return DB::transaction(function () use ($initiator, $recipient, $subject, $firstMessageBody): Conversation {
            $conversation = Conversation::create(['subject' => $subject]);

            $conversation->participants()->attach([
                $initiator->id => ['joined_at' => now()],
                $recipient->id => ['joined_at' => now()],
            ]);

            $this->send($conversation, $initiator, $firstMessageBody);

            return $conversation;
        });
    }

    public function send(Conversation $conversation, User $sender, string $body): Message
    {
        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $sender->id,
            'body' => $body,
            'sent_at' => now(),
        ]);

        foreach ($conversation->participants as $participant) {
            if ($participant->id !== $sender->id) {
                $this->notificationDispatcher->notifyNewMessage($participant, $conversation, $sender);
            }
        }

        return $message;
    }

    /**
     * Read receipts (business rule "Read receipts"): a single `read_at` per message works
     * cleanly for a strictly-2-party conversation — it always means "read by the other
     * participant," with no ambiguity a group chat would introduce.
     */
    public function markRead(Conversation $conversation, User $reader): void
    {
        Message::query()
            ->where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $reader->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    /**
     * The compose-recipient picker's data source: every user this one is allowed to start a
     * conversation with, per canConverseWith()'s exact same role-pair rule.
     *
     * @return Collection<int, User>
     */
    public function contactableUsers(User $user): Collection
    {
        if ($user->role === UserRole::Admin) {
            return User::query()->where('id', '!=', $user->id)->whereIn('role', [UserRole::Admin, UserRole::Instructor, UserRole::Student])->orderBy('name')->get();
        }

        if ($user->role === UserRole::Instructor) {
            $studentIds = Enrolment::query()
                ->where('status', EnrolmentStatus::Confirmed)
                ->whereIn('course_id', $user->coursesTaught()->pluck('courses.id'))
                ->pluck('student_id');

            return User::query()
                ->where(fn ($query) => $query->where('role', UserRole::Admin)->orWhereIn('id', $studentIds))
                ->orderBy('name')
                ->get();
        }

        $instructorIds = Enrolment::query()
            ->where('student_id', $user->id)
            ->where('status', EnrolmentStatus::Confirmed)
            ->with('course.instructors')
            ->get()
            ->flatMap(fn (Enrolment $enrolment) => $enrolment->course->instructors->pluck('id'));

        return User::query()
            ->where(fn ($query) => $query->where('role', UserRole::Admin)->orWhereIn('id', $instructorIds))
            ->orderBy('name')
            ->get();
    }

    private function instructorTeachesStudent(User $userA, User $userB): bool
    {
        $instructor = $userA->role === UserRole::Instructor ? $userA : $userB;
        $student = $userA->role === UserRole::Student ? $userA : $userB;

        $instructorCourseIds = $instructor->coursesTaught()->pluck('courses.id');

        return Enrolment::query()
            ->where('student_id', $student->id)
            ->where('status', EnrolmentStatus::Confirmed)
            ->whereIn('course_id', $instructorCourseIds)
            ->exists();
    }
}
