<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Services\Communication\ConversationService;

final class MessageController extends Controller
{
    public function __construct(private readonly ConversationService $conversationService) {}

    public function store(StoreMessageRequest $request, Conversation $conversation): MessageResource
    {
        $message = $this->conversationService->send($conversation, $request->user(), $request->validated('body'));

        return new MessageResource($message->load('sender'));
    }
}
