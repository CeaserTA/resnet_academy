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

final class ForumThreadController extends Controller
{
    public function __construct(private readonly ForumService $forumService) {}

    /**
     * FR-18 "search": `?search=` matches the head post's body via the full-text index on
     * `forum_posts.body`. `?mine=1` scopes to the caller's own posts (the "My Posts" tab).
     */
    public function index(Request $request, Course $course): AnonymousResourceCollection
    {
        $this->authorize('viewAny', [ForumThread::class, $course]);

        $forum = $this->forumService->forCourse($course);
        $search = $request->query('search');

        $threads = ForumThread::query()
            ->where('forum_id', $forum->id)
            ->when($request->boolean('mine'), fn ($query) => $query->where('created_by', $request->user()->id))
            ->when($search, fn ($query) => $query->whereHas(
                'posts',
                fn ($postQuery) => $postQuery->whereFullText('body', $search, ['mode' => 'boolean']),
            ))
            ->withCount('posts')
            ->with(['creator', 'headPost.user'])
            ->orderByDesc('is_pinned')
            ->latest('id')
            ->get();

        return ForumThreadResource::collection($threads);
    }

    public function store(StoreForumThreadRequest $request, Course $course): ForumThreadResource
    {
        $thread = $this->forumService->createThread(
            $course,
            $request->user(),
            $request->validated('body'),
            $request->validated('attachment_type') ? ForumPostAttachmentType::from($request->validated('attachment_type')) : null,
            $request->file('attachment'),
        );

        return new ForumThreadResource($thread->load(['creator', 'headPost.user'])->loadCount('posts'));
    }

    public function show(ForumThread $thread): ForumThreadResource
    {
        $this->authorize('view', $thread);

        return new ForumThreadResource($thread->load(['posts.user']));
    }

    /**
     * Forum moderation (business rule "Forum moderation"): pin/lock only, course-teaching
     * instructor or admin.
     */
    public function update(UpdateForumThreadRequest $request, ForumThread $thread): ForumThreadResource
    {
        $thread->update($request->validated());

        return new ForumThreadResource($thread->load(['creator', 'headPost.user'])->loadCount('posts'));
    }
}
