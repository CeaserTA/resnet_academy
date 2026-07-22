<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The feed shape: `title` is internal-only (never shown in the UI) so it's deliberately not
 * exposed here. `post` is the thread's head post (its body/attachment) — see
 * `ForumThread::headPost()` — and `reply_count` excludes that head post from the total.
 * `replies` is only populated on the single-thread `show()` response (eager-loads `posts`),
 * used to lazily expand a feed card's comment section — the feed list endpoint never pays for
 * every reply's payload.
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
            'creator' => new UserResource($this->whenLoaded('creator')),
            'is_pinned' => $this->is_pinned,
            'is_locked' => $this->is_locked,
            'created_at' => $this->created_at->toIso8601String(),
            'reply_count' => $this->when($this->posts_count !== null, fn () => max(0, $this->posts_count - 1)),
            'post' => new ForumPostResource($this->whenLoaded('headPost')),
            'replies' => ForumPostResource::collection(
                $this->whenLoaded('posts', function () {
                    $headPostId = $this->posts->sortBy('id')->first()?->id;

                    return $this->posts->reject(fn ($post) => $post->id === $headPostId)->values();
                }),
            ),
        ];
    }
}
