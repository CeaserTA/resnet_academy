<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreConversationRequest;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\UserResource;
use App\Models\Conversation;
use App\Models\User;
use App\Services\Communication\ConversationService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class ConversationController extends Controller
{
    public function __construct(private readonly ConversationService $conversationService) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $conversations = Conversation::query()
            ->whereHas('participants', fn ($query) => $query->where('users.id', $request->user()->id))
            ->with(['participants', 'messages'])
            ->latest('id')
            ->get();

        return ConversationResource::collection($conversations);
    }

    /**
     * The compose-recipient picker's data source (canConverseWith()'s audience for this user).
     */
    public function contactable(Request $request): AnonymousResourceCollection
    {
        return UserResource::collection($this->conversationService->contactableUsers($request->user()));
    }

    public function store(StoreConversationRequest $request): ConversationResource
    {
        $recipient = User::findOrFail($request->validated('recipient_id'));

        $conversation = $this->conversationService->startOrGet(
            $request->user(),
            $recipient,
            $request->validated('subject'),
            $request->validated('body'),
        );

        return new ConversationResource($conversation->load(['participants', 'messages']));
    }

    public function show(Request $request, Conversation $conversation): ConversationResource
    {
        $this->authorize('view', $conversation);

        $this->conversationService->markRead($conversation, $request->user());

        return new ConversationResource($conversation->load(['participants', 'messages.sender']));
    }
}
