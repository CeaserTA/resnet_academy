<?php

declare(strict_types=1);

namespace App\Services\Communication;

use App\Enums\ForumPostAttachmentType;
use App\Models\Course;
use App\Models\Forum;
use App\Models\ForumPost;
use App\Models\ForumTag;
use App\Models\ForumThread;
use App\Models\User;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Storage\MediaStorageService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * FR-18: forums are course-scoped. One forum per course, created lazily on first access
 * rather than requiring a separate "create forum" admin action — schema.sql leaves the door
 * open for more than one per course (no unique constraint on course_id) but this MVP only
 * ever needs the one.
 *
 * Threaded-discussion refactor: a "discussion" is a `ForumThread` + its oldest `ForumPost` (see
 * `ForumThread::headPost()`); everything else in the thread is a reply. `title` is a real,
 * required, user-authored field again (it was auto-derived from the body during the earlier feed
 * redesign — existing threads already have a value there from that era, so nothing needed
 * backfilling when it became user-facing again).
 */
final class ForumService
{
    public function __construct(
        private readonly NotificationDispatcher $notificationDispatcher,
        private readonly MediaStorageService $mediaStorage,
    ) {}

    public function forCourse(Course $course): Forum
    {
        return Forum::query()->firstOrCreate(
            ['course_id' => $course->id],
            ['title' => 'General Discussion'],
        );
    }

    /**
     * @param  array<int, string>  $tagNames
     */
    public function createThread(
        Course $course,
        User $author,
        string $title,
        string $body,
        array $tagNames = [],
        ?ForumPostAttachmentType $attachmentType = null,
        ?UploadedFile $attachment = null,
    ): ForumThread {
        $forum = $this->forCourse($course);

        $thread = DB::transaction(function () use ($forum, $course, $author, $title, $body, $attachmentType, $attachment): ForumThread {
            $thread = ForumThread::create([
                'forum_id' => $forum->id,
                'created_by' => $author->id,
                'title' => $title,
                'last_activity_at' => now(),
            ]);

            [$path, $originalName] = $this->storeAttachment($course, $attachment);

            ForumPost::create([
                'thread_id' => $thread->id,
                'user_id' => $author->id,
                'body' => $body,
                'attachment_type' => $attachmentType,
                'attachment_path' => $path,
                'attachment_original_name' => $originalName,
            ]);

            return $thread;
        });

        $this->syncTags($thread, $tagNames);

        return $thread;
    }

    /**
     * Replies stay text-only — the composer's attachment buttons only appear on the top-level
     * discussion post, matching the design; not an oversight.
     */
    public function reply(ForumThread $thread, User $author, string $body): ForumPost
    {
        $post = ForumPost::create([
            'thread_id' => $thread->id,
            'user_id' => $author->id,
            'body' => $body,
        ]);

        $thread->update(['last_activity_at' => now()]);

        if ($thread->created_by !== $author->id) {
            $this->notificationDispatcher->notifyForumReply($thread->creator, $thread, $author);
        }

        return $post;
    }

    /**
     * Staff-only (`ForumThreadPolicy::moderate`) — the spec's own role list gives "mark solved"
     * to the instructor, not the thread's own author.
     */
    public function markThreadSolved(ForumThread $thread, User $actor): void
    {
        $thread->update(['solved' => true]);

        if ($thread->created_by !== $actor->id) {
            $this->notificationDispatcher->notifyForumThreadSolved($thread->creator, $thread);
        }
    }

    public function markThreadRead(User $user, ForumThread $thread): void
    {
        DB::table('forum_thread_reads')->updateOrInsert(
            ['user_id' => $user->id, 'thread_id' => $thread->id],
            ['last_read_at' => now()],
        );
    }

    /**
     * Find-or-create each tag by case-insensitive name, then replace the thread's tag set —
     * matches the composer's "pick existing or type a new one" UX.
     *
     * @param  array<int, string>  $tagNames
     */
    public function syncTags(ForumThread $thread, array $tagNames): void
    {
        $tagIds = collect($tagNames)
            ->map(fn (string $name): string => trim($name))
            ->filter()
            ->unique(fn (string $name): string => Str::lower($name))
            ->map(function (string $name): int {
                $tag = ForumTag::query()->whereRaw('LOWER(name) = ?', [Str::lower($name)])->first();

                if ($tag !== null) {
                    return $tag->id;
                }

                return ForumTag::create(['name' => $name, 'slug' => Str::slug($name)])->id;
            });

        $thread->tags()->sync($tagIds);
    }

    public function updatePost(
        ForumPost $post,
        string $body,
        ?ForumPostAttachmentType $attachmentType,
        ?UploadedFile $attachment,
        bool $removeAttachment,
    ): ForumPost {
        $course = $post->thread->forum->course;

        $update = ['body' => $body];

        if ($attachment) {
            $this->deleteStoredAttachment($post);
            [$path, $originalName] = $this->storeAttachment($course, $attachment);
            $update['attachment_type'] = $attachmentType;
            $update['attachment_path'] = $path;
            $update['attachment_original_name'] = $originalName;
        } elseif ($removeAttachment) {
            $this->deleteStoredAttachment($post);
            $update['attachment_type'] = null;
            $update['attachment_path'] = null;
            $update['attachment_original_name'] = null;
        } elseif ($attachmentType !== null) {
            // Article mode can be toggled without a file (it never has one).
            $update['attachment_type'] = $attachmentType;
        }

        $post->update($update);

        return $post->fresh();
    }

    /**
     * Deleting a thread's head post removes the whole feed post — cascades to every reply via
     * the FK on `forum_posts.thread_id`. Deleting any other post just removes that one reply.
     */
    public function deletePost(ForumPost $post): void
    {
        $this->deleteStoredAttachment($post);

        if ($post->thread->headPost->id === $post->id) {
            $post->thread->delete();

            return;
        }

        $post->delete();
    }

    /**
     * @return array{0: ?string, 1: ?string} [stored path, original filename]
     */
    private function storeAttachment(Course $course, ?UploadedFile $attachment): array
    {
        if (! $attachment) {
            return [null, null];
        }

        $path = $this->mediaStorage->store($attachment, "forum-attachments/{$course->id}");

        return [$path, $attachment->getClientOriginalName()];
    }

    private function deleteStoredAttachment(ForumPost $post): void
    {
        $this->mediaStorage->delete($post->attachment_path);
    }
}
