<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Threaded-discussion refactor: `title` is a real, required, user-authored field (see
 * `ForumService::createThread()`'s docblock). `post` is the discussion's head post (its
 * body/attachment) — see `ForumThread::headPost()`. `reply_count` excludes that head post from
 * the total. Replies themselves are no longer embedded here — they're paginated separately via
 * `GET /forum-threads/{thread}/posts` (`ForumPostController::index()`), so a list of discussions
 * never pays for every reply's payload.
 */
final class ForumThreadResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'forum_id' => $this->forum_id,
            'title' => $this->title,
            'creator' => new UserResource($this->whenLoaded('creator')),
            'is_pinned' => $this->is_pinned,
            'is_locked' => $this->is_locked,
            'solved' => $this->solved,
            'created_at' => $this->created_at->toIso8601String(),
            'last_activity_at' => $this->last_activity_at?->toIso8601String(),
            'reply_count' => $this->when($this->posts_count !== null, fn () => max(0, $this->posts_count - 1)),
            'post' => new ForumPostResource($this->whenLoaded('headPost')),
            'latest_participant' => $this->whenLoaded(
                'latestPost',
                fn () => $this->latestPost ? new UserResource($this->latestPost->user) : null,
            ),
            'tags' => ForumTagResource::collection($this->whenLoaded('tags')),
            'unread' => $this->when(
                array_key_exists('viewer_last_read_at', $this->resource->getAttributes()),
                fn () => $this->last_activity_at !== null
                    && (
                        $this->viewer_last_read_at === null
                        || $this->last_activity_at->gt($this->viewer_last_read_at)
                    ),
            ),
        ];
    }
}
