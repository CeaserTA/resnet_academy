<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\ForumPostAttachmentType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreForumThreadRequest;
use App\Http\Requests\Api\V1\UpdateForumThreadRequest;
use App\Http\Resources\ForumThreadResource;
use App\Models\Course;
use App\Models\ForumThread;
use App\Services\Communication\ForumService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

final class ForumThreadController extends Controller
{
    public function __construct(private readonly ForumService $forumService) {}

    /**
     * `?search=` matches the discussion title (`LIKE`) or any post's body (full-text index on
     * `forum_posts.body`, which already covers replies as well as the head post). `?mine=1`
     * scopes to the caller's own discussions. `?sort=` is `latest_activity` (default),
     * `newest`, or `most_replies`; pinned discussions always sort first regardless. `?tags[]=`
     * filters to discussions carrying ANY of the given tag ids.
     */
    public function index(Request $request, Course $course): AnonymousResourceCollection
    {
        $this->authorize('viewAny', [ForumThread::class, $course]);

        $forum = $this->forumService->forCourse($course);
        $search = $request->query('search');
        $sort = $request->query('sort', 'latest_activity');
        $tagIds = array_map('intval', (array) $request->query('tags', []));

        $query = ForumThread::query()
            ->where('forum_id', $forum->id)
            ->when($request->boolean('mine'), fn ($q) => $q->where('created_by', $request->user()->id))
            ->when($search, fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('title', 'like', "%{$search}%")
                    ->orWhereHas('posts', fn ($postQuery) => $postQuery->whereFullText('body', $search, ['mode' => 'boolean']));
            }))
            ->when($tagIds !== [], fn ($q) => $q->whereHas('tags', fn ($tagQuery) => $tagQuery->whereIn('forum_tags.id', $tagIds)))
            ->withCount('posts')
            ->with(['creator', 'headPost.user', 'latestPost.user', 'tags'])
            ->orderByDesc('is_pinned');

        match ($sort) {
            'newest' => $query->orderByDesc('created_at'),
            'most_replies' => $query->orderByDesc('posts_count'),
            default => $query->orderByDesc('last_activity_at'),
        };

        $threads = $query->paginate(20)->withQueryString();

        $readMap = DB::table('forum_thread_reads')
            ->where('user_id', $request->user()->id)
            ->whereIn('thread_id', $threads->pluck('id'))
            ->pluck('last_read_at', 'thread_id');

        $threads->getCollection()->each(
            fn (ForumThread $thread) => $thread->setAttribute('viewer_last_read_at', $readMap[$thread->id] ?? null),
        );

        return ForumThreadResource::collection($threads);
    }

    public function store(StoreForumThreadRequest $request, Course $course): ForumThreadResource
    {
        $thread = $this->forumService->createThread(
            $course,
            $request->user(),
            $request->validated('title'),
            $request->validated('body'),
            $request->validated('tags', []),
            $request->validated('attachment_type') ? ForumPostAttachmentType::from($request->validated('attachment_type')) : null,
            $request->file('attachment'),
        );

        return new ForumThreadResource($thread->load(['creator', 'headPost.user', 'tags'])->loadCount('posts'));
    }

    public function show(Request $request, ForumThread $thread): ForumThreadResource
    {
        $this->authorize('view', $thread);

        $this->forumService->markThreadRead($request->user(), $thread);

        return new ForumThreadResource($thread->load(['creator', 'headPost.user', 'tags'])->loadCount('posts'));
    }

    /**
     * Forum moderation (business rule "Forum moderation"): pin/lock/solved, course-teaching
     * instructor or admin only. Marking solved (but not un-solving) notifies the discussion's
     * author, so that side effect is routed through the service rather than a plain mass update.
     */
    public function update(UpdateForumThreadRequest $request, ForumThread $thread): ForumThreadResource
    {
        if ($request->has('solved')) {
            if ($request->boolean('solved') && ! $thread->solved) {
                $this->forumService->markThreadSolved($thread, $request->user());
            } elseif (! $request->boolean('solved')) {
                $thread->update(['solved' => false]);
            }
        }

        $thread->update($request->safe()->only(['is_pinned', 'is_locked']));

        return new ForumThreadResource($thread->fresh(['creator', 'headPost.user', 'tags'])->loadCount('posts'));
    }
}
