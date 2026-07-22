<?php

declare(strict_types=1);

namespace App\Services\Communication;

use App\Enums\TicketStatus;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Services\Notifications\NotificationDispatcher;
use Illuminate\Support\Facades\DB;

/**
 * Student support tickets — separate from the generic conversations system (schema.sql's own
 * design note draws this line explicitly).
 */
final class TicketService
{
    public function __construct(private readonly NotificationDispatcher $notificationDispatcher) {}

    /**
     * @param  array{subject: string, body: string, course_id?: int}  $data
     */
    public function create(User $student, array $data): Ticket
    {
        return DB::transaction(function () use ($student, $data): Ticket {
            $ticket = Ticket::create([
                'student_id' => $student->id,
                'course_id' => $data['course_id'] ?? null,
                'subject' => $data['subject'],
                'status' => TicketStatus::Open,
            ]);

            TicketMessage::create([
                'ticket_id' => $ticket->id,
                'sender_id' => $student->id,
                'body' => $data['body'],
            ]);

            return $ticket;
        });
    }

    public function reply(Ticket $ticket, User $sender, string $body): TicketMessage
    {
        $message = TicketMessage::create([
            'ticket_id' => $ticket->id,
            'sender_id' => $sender->id,
            'body' => $body,
        ]);

        if ($sender->id === $ticket->student_id) {
            if ($ticket->assigned_to !== null) {
                $this->notificationDispatcher->notifyTicketReply($ticket->assignedTo, $ticket, $sender);
            }
        } else {
            $this->notificationDispatcher->notifyTicketReply($ticket->student, $ticket, $sender);
        }

        return $message;
    }

    /**
     * @param  array{status?: string, assigned_to?: int|null}  $data
     */
    public function update(Ticket $ticket, array $data): Ticket
    {
        $updates = [];

        if (array_key_exists('status', $data)) {
            $status = TicketStatus::from($data['status']);
            $updates['status'] = $status;
            $updates['resolved_at'] = in_array($status, [TicketStatus::Resolved, TicketStatus::Closed], true)
                ? now()
                : null;
        }

        if (array_key_exists('assigned_to', $data)) {
            $updates['assigned_to'] = $data['assigned_to'];
        }

        $ticket->update($updates);

        return $ticket->fresh();
    }
}
