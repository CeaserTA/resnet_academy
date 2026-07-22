<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreTicketMessageRequest;
use App\Http\Resources\TicketMessageResource;
use App\Models\Ticket;
use App\Services\Communication\TicketService;

final class TicketMessageController extends Controller
{
    public function __construct(private readonly TicketService $ticketService) {}

    public function store(StoreTicketMessageRequest $request, Ticket $ticket): TicketMessageResource
    {
        $message = $this->ticketService->reply($ticket, $request->user(), $request->validated('body'));

        return new TicketMessageResource($message->load('sender'));
    }
}
