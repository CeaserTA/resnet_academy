<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreTicketRequest;
use App\Http\Requests\Api\V1\UpdateTicketRequest;
use App\Http\Resources\TicketResource;
use App\Models\Ticket;
use App\Services\Communication\TicketService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class TicketController extends Controller
{
    public function __construct(private readonly TicketService $ticketService) {}

    /**
     * Student: own tickets. Instructor: tickets for courses they teach, plus ones assigned to
     * them. Admin: every ticket.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $tickets = Ticket::query()
            ->when($user->role === UserRole::Student, fn ($query) => $query->where('student_id', $user->id))
            ->when($user->role === UserRole::Instructor, function ($query) use ($user) {
                $taughtCourseIds = $user->coursesTaught()->pluck('courses.id');
                $query->where(fn ($inner) => $inner->where('assigned_to', $user->id)->orWhereIn('course_id', $taughtCourseIds));
            })
            ->with(['student', 'course', 'assignedTo'])
            ->latest('id')
            ->get();

        return TicketResource::collection($tickets);
    }

    public function store(StoreTicketRequest $request): TicketResource
    {
        $ticket = $this->ticketService->create($request->user(), $request->validated());

        return new TicketResource($ticket->load(['student', 'course', 'assignedTo', 'messages.sender']));
    }

    public function show(Ticket $ticket): TicketResource
    {
        $this->authorize('view', $ticket);

        return new TicketResource($ticket->load(['student', 'course', 'assignedTo', 'messages.sender']));
    }

    public function update(UpdateTicketRequest $request, Ticket $ticket): TicketResource
    {
        $ticket = $this->ticketService->update($ticket, $request->validated());

        return new TicketResource($ticket->load(['student', 'course', 'assignedTo']));
    }
}
