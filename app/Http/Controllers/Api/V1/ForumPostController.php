<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\ForumPostAttachmentType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreForumPostRequest;
use App\Http\Requests\Api\V1\UpdateForumPostRequest;
use App\Http\Resources\ForumPostResource;
use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Services\Communication\ForumService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class ForumPostController extends Controller
{
    public function __construct(private readonly ForumService $forumService) {}

    /**
     * Paginated replies (everything but the thread's head post) — "lazy load replies" instead
     * of the old single-response `posts.user` eager load, oldest-first (chat reading order).
     */
    public function index(ForumThread $thread): AnonymousResourceCollection
    {
        $this->authorize('view', $thread);

        $headPostId = $thread->headPost->id;

        $posts = $thread->posts()
            ->where('id', '!=', $headPostId)
            ->with('user')
            ->oldest('id')
            ->paginate(30);

        return ForumPostResource::collection($posts);
    }

    public function store(StoreForumPostRequest $request, ForumThread $thread): ForumPostResource
    {
        $post = $this->forumService->reply($thread, $request->user(), $request->validated('body'));

        return new ForumPostResource($post->load('user'));
    }

    public function update(UpdateForumPostRequest $request, ForumPost $post): ForumPostResource
    {
        $updated = $this->forumService->updatePost(
            $post,
            $request->validated('body'),
            $request->validated('attachment_type') ? ForumPostAttachmentType::from($request->validated('attachment_type')) : null,
            $request->file('attachment'),
            $request->boolean('remove_attachment'),
        );

        return new ForumPostResource($updated->load('user'));
    }

    public function destroy(ForumPost $post): Response
    {
        $this->authorize('delete', $post);

        $this->forumService->deletePost($post);

        return response()->noContent();
    }
}
