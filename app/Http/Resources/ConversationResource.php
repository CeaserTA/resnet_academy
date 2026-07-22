<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property Conversation $resource
 */
final class ConversationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $currentUserId = $request->user()?->id;

        return [
            'id' => $this->id,
            'subject' => $this->subject,
            'participants' => UserResource::collection($this->whenLoaded('participants')),
            'unread_count' => $this->when(
                $this->resource->relationLoaded('messages'),
                fn () => $this->messages->where('sender_id', '!=', $currentUserId)->whereNull('read_at')->count(),
            ),
            'last_message' => $this->whenLoaded(
                'messages',
                fn () => $this->messages->sortByDesc('sent_at')->first()
                    ? new MessageResource($this->messages->sortByDesc('sent_at')->first())
                    : null,
            ),
            'messages' => MessageResource::collection($this->whenLoaded('messages')),
        ];
    }
}
