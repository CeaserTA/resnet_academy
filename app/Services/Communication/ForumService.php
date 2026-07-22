<?php

declare(strict_types=1);

namespace App\Services\Communication;

use App\Enums\ForumPostAttachmentType;
use App\Models\Course;
use App\Models\Forum;
use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\User;
use App\Services\Notifications\NotificationDispatcher;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * FR-18: forums are course-scoped. One forum per course, created lazily on first access
 * rather than requiring a separate "create forum" admin action — schema.sql leaves the door
 * open for more than one per course (no unique constraint on course_id) but this MVP only
 * ever needs the one.
 *
 * Feed redesign: a "feed post" is a `ForumThread` + its oldest `ForumPost` (see
 * `ForumThread::headPost()`); everything else in the thread is a reply. `title` still exists
 * on `forum_threads` (schema keeps it NOT NULL) but is now purely internal, auto-generated
 * from the body — the UI never asks for or shows it.
 */
final class ForumService
{
    public function __construct(private readonly NotificationDispatcher $notificationDispatcher) {}

    public function forCourse(Course $course): Forum
    {
        return Forum::query()->firstOrCreate(
            ['course_id' => $course->id],
            ['title' => 'General Discussion'],
        );
    }

    public function createThread(
        Course $course,
        User $author,
        string $body,
        ?ForumPostAttachmentType $attachmentType = null,
        ?UploadedFile $attachment = null,
    ): ForumThread {
        $forum = $this->forCourse($course);

        return DB::transaction(function () use ($forum, $course, $author, $body, $attachmentType, $attachment): ForumThread {
            $thread = ForumThread::create([
                'forum_id' => $forum->id,
                'created_by' => $author->id,
                'title' => Str::limit($body, 190, ''),
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
    }

    /**
     * Replies stay text-only — the composer's attachment buttons only appear on the top-level
     * feed post, matching the design; not an oversight.
     */
    public function reply(ForumThread $thread, User $author, string $body): ForumPost
    {
        $post = ForumPost::create([
            'thread_id' => $thread->id,
            'user_id' => $author->id,
            'body' => $body,
        ]);

        if ($thread->created_by !== $author->id) {
            $this->notificationDispatcher->notifyForumReply($thread->creator, $thread, $author);
        }

        return $post;
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

        $path = $attachment->store("forum-attachments/{$course->id}", 'public');

        return [$path, $attachment->getClientOriginalName()];
    }

    private function deleteStoredAttachment(ForumPost $post): void
    {
        if ($post->attachment_path) {
            Storage::disk('public')->delete($post->attachment_path);
        }
    }
}
