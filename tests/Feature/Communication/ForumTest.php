<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Models\Course;
use App\Models\ForumPost;
use App\Models\ForumTag;
use App\Models\ForumThread;
use App\Models\Notification;
use App\Models\User;
use App\Services\Communication\ForumService;
use App\Services\Enrolment\EnrolmentService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function setUpForumCourseWithStudent(): array
{
    $admin = User::factory()->admin()->create();
    $instructor = User::factory()->instructor()->create();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['created_by' => $admin->id]);
    $course->instructors()->attach($instructor->id, ['is_primary' => true, 'assigned_at' => now()]);
    app(EnrolmentService::class)->enrol($student, $course, EnrolmentSource::Self);

    return compact('admin', 'instructor', 'student', 'course');
}

it('lets an enrolled student create a discussion and reply, notifying the discussion author', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();
    $otherStudentEnrolled = User::factory()->student()->create();
    app(EnrolmentService::class)->enrol($otherStudentEnrolled, $course, EnrolmentSource::Self);

    $thread = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'title' => 'When does it unlock?',
        'body' => 'Does anyone know when it unlocks?',
    ]);
    $thread->assertCreated();
    $thread->assertJsonPath('data.title', 'When does it unlock?');
    $threadId = $thread->json('data.id');

    $reply = $this->actingAs($otherStudentEnrolled)->postJson("/api/v1/forum-threads/{$threadId}/posts", [
        'body' => 'I think it unlocks next week.',
    ]);
    $reply->assertCreated();

    expect(Notification::where('user_id', $student->id)->where('type', 'forum_reply')->exists())->toBeTrue();
});

it('requires a title when creating a discussion', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();

    $response = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'body' => 'No title given.',
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors('title', responseKey: 'error.fields');
});

it('denies a student outside the course from posting in its forum', function (): void {
    ['course' => $course] = setUpForumCourseWithStudent();
    $outsider = User::factory()->student()->create();

    $response = $this->actingAs($outsider)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'title' => 'Should not work',
        'body' => 'Should not work.',
    ]);

    $response->assertForbidden();
});

it('attaches an image to a discussion and exposes a downloadable url', function (): void {
    Storage::fake('public');
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();

    $response = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'title' => 'Check this out',
        'body' => 'Check out this diagram.',
        'attachment_type' => 'image',
        'attachment' => UploadedFile::fake()->create('diagram.jpg', 100, 'image/jpeg'),
    ]);

    $response->assertCreated();
    expect($response->json('data.post.attachment_type'))->toBe('image');
    expect($response->json('data.post.attachment_url'))->not->toBeNull();

    $path = ForumPost::first()->attachment_path;
    Storage::disk('public')->assertExists($path);
});

it('rejects a video attachment over 5MB', function (): void {
    Storage::fake('public');
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();

    $response = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'title' => 'Big clip',
        'body' => 'Big clip.',
        'attachment_type' => 'video',
        'attachment' => UploadedFile::fake()->create('clip.mp4', 6000, 'video/mp4'),
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors('attachment', responseKey: 'error.fields');
});

it('lets the author edit their own discussion body and swap its attachment', function (): void {
    Storage::fake('public');
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();

    $created = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'title' => 'Original title',
        'body' => 'Original body.',
        'attachment_type' => 'image',
        'attachment' => UploadedFile::fake()->create('first.jpg', 100, 'image/jpeg'),
    ])->assertCreated();

    $postId = $created->json('data.post.id');
    $originalPath = ForumPost::find($postId)->attachment_path;

    // `edited` is derived from created_at !== updated_at (no separate edited_at column, see
    // ForumPostResource) — forum_posts' timestamp columns have no fractional-second precision,
    // so an edit within the same wall-clock second as creation would be indistinguishable from
    // "never edited." Travel forward so this test exercises a real difference.
    $this->travel(1)->second();

    $updated = $this->actingAs($student)->postJson("/api/v1/forum-posts/{$postId}", [
        '_method' => 'PATCH',
        'body' => 'Edited body.',
        'attachment_type' => 'image',
        'attachment' => UploadedFile::fake()->create('second.jpg', 100, 'image/jpeg'),
    ]);

    $updated->assertOk();
    $updated->assertJsonPath('data.body', 'Edited body.');
    $updated->assertJsonPath('data.edited', true);
    Storage::disk('public')->assertMissing($originalPath);
});

it('denies a non-owner from editing someone else\'s discussion', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();
    $otherStudent = User::factory()->student()->create();
    app(EnrolmentService::class)->enrol($otherStudent, $course, EnrolmentSource::Self);

    $created = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'title' => 'Original title',
        'body' => 'Original body.',
    ])->assertCreated();

    $response = $this->actingAs($otherStudent)->patchJson("/api/v1/forum-posts/{$created->json('data.post.id')}", [
        'body' => 'Hijacked.',
    ]);

    $response->assertForbidden();
});

it('deletes the whole discussion and its replies when the head post is deleted', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();

    $created = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'title' => 'Original title',
        'body' => 'Original body.',
    ])->assertCreated();
    $threadId = $created->json('data.id');
    $headPostId = $created->json('data.post.id');

    $this->actingAs($student)->postJson("/api/v1/forum-threads/{$threadId}/posts", ['body' => 'A reply.'])
        ->assertCreated();

    $this->actingAs($student)->deleteJson("/api/v1/forum-posts/{$headPostId}")->assertNoContent();

    expect(ForumThread::find($threadId))->toBeNull();
    expect(ForumPost::where('thread_id', $threadId)->count())->toBe(0);
});

it('deletes only a reply post, leaving the discussion and other replies intact', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();

    $created = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'title' => 'Original title',
        'body' => 'Original body.',
    ])->assertCreated();
    $threadId = $created->json('data.id');

    $reply = $this->actingAs($student)->postJson("/api/v1/forum-threads/{$threadId}/posts", ['body' => 'A reply.'])
        ->assertCreated();

    $this->actingAs($student)->deleteJson("/api/v1/forum-posts/{$reply->json('data.id')}")->assertNoContent();

    expect(ForumThread::find($threadId))->not->toBeNull();
    expect(ForumPost::where('thread_id', $threadId)->count())->toBe(1);
});

it('scopes the "mine" filter to the caller\'s own discussions', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();
    $otherStudent = User::factory()->student()->create();
    app(EnrolmentService::class)->enrol($otherStudent, $course, EnrolmentSource::Self);

    $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", ['title' => 'Mine', 'body' => 'Mine.'])
        ->assertCreated();
    $this->actingAs($otherStudent)->postJson("/api/v1/courses/{$course->id}/forum/threads", ['title' => 'Not mine', 'body' => 'Not mine.'])
        ->assertCreated();

    $mine = $this->actingAs($student)->getJson("/api/v1/courses/{$course->id}/forum/threads?mine=1");
    $mine->assertOk();
    expect($mine->json('data'))->toHaveCount(1);
    expect($mine->json('data.0.post.body'))->toBe('Mine.');

    $feed = $this->actingAs($student)->getJson("/api/v1/courses/{$course->id}/forum/threads");
    expect($feed->json('data'))->toHaveCount(2);
});

it('searches discussion titles in addition to post bodies', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();

    $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'title' => 'Photosynthesis question',
        'body' => 'Let us talk about chlorophyll and sunlight absorption in plant cells.',
    ])->assertCreated();

    $titleMatch = $this->actingAs($student)->getJson("/api/v1/courses/{$course->id}/forum/threads?search=Photosynthesis");
    $titleMatch->assertOk();
    expect($titleMatch->json('data'))->toHaveCount(1);

    $noMatch = $this->actingAs($student)->getJson("/api/v1/courses/{$course->id}/forum/threads?search=xylophone");
    $noMatch->assertOk();
    expect($noMatch->json('data'))->toHaveCount(0);

    // The full-text match path (whereFullText against forum_posts.body) is NOT exercised here:
    // InnoDB's FULLTEXT index isn't synchronously visible to a query inside the same
    // uncommitted transaction that inserted the row, and RefreshDatabase wraps every test in
    // exactly that — a transaction, rolled back afterward. Manually verified instead via
    // `php artisan tinker` against committed rows in the real dev database.
});

it('paginates the discussion list instead of returning everything at once', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();
    $forum = app(ForumService::class)->forCourse($course);

    ForumThread::factory()->count(25)->create(['forum_id' => $forum->id, 'created_by' => $student->id]);

    $page1 = $this->actingAs($student)->getJson("/api/v1/courses/{$course->id}/forum/threads");
    $page1->assertOk();
    expect($page1->json('data'))->toHaveCount(20);
    expect($page1->json('meta.last_page'))->toBe(2);

    $page2 = $this->actingAs($student)->getJson("/api/v1/courses/{$course->id}/forum/threads?page=2");
    $page2->assertOk();
    expect($page2->json('data'))->toHaveCount(5);
});

it('sorts discussions by newest or most replies when requested, pinned always first', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();
    $forum = app(ForumService::class)->forCourse($course);

    $older = ForumThread::factory()->create([
        'forum_id' => $forum->id,
        'created_by' => $student->id,
        'created_at' => now()->subDay(),
        'last_activity_at' => now()->subDay(),
    ]);
    $newer = ForumThread::factory()->create([
        'forum_id' => $forum->id,
        'created_by' => $student->id,
        'created_at' => now(),
        'last_activity_at' => now()->subHours(2),
    ]);
    $pinned = ForumThread::factory()->create([
        'forum_id' => $forum->id,
        'created_by' => $student->id,
        'is_pinned' => true,
        'created_at' => now()->subWeek(),
        'last_activity_at' => now()->subWeek(),
    ]);

    $newest = $this->actingAs($student)->getJson("/api/v1/courses/{$course->id}/forum/threads?sort=newest");
    $newest->assertOk();
    expect($newest->json('data.0.id'))->toBe($pinned->id);
    expect($newest->json('data.1.id'))->toBe($newer->id);
    expect($newest->json('data.2.id'))->toBe($older->id);
});

it('creates tags on a new discussion and filters the list by tag', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();

    $created = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'title' => 'Provider vs Riverpod',
        'body' => 'Which should I use?',
        'tags' => ['Flutter', 'State Management'],
    ]);
    $created->assertCreated();
    expect($created->json('data.tags'))->toHaveCount(2);

    $tagsList = $this->actingAs($student)->getJson('/api/v1/forum-tags');
    $tagsList->assertOk();
    expect($tagsList->json('data'))->toHaveCount(2);
    $flutterTagId = collect($tagsList->json('data'))->firstWhere('name', 'Flutter')['id'];

    $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'title' => 'Unrelated question',
        'body' => 'Nothing to do with tags.',
    ])->assertCreated();

    $filtered = $this->actingAs($student)->getJson("/api/v1/courses/{$course->id}/forum/threads?tags[]={$flutterTagId}");
    $filtered->assertOk();
    expect($filtered->json('data'))->toHaveCount(1);
    expect($filtered->json('data.0.title'))->toBe('Provider vs Riverpod');
});

it('reuses an existing tag by case-insensitive name instead of creating a duplicate', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();
    ForumTag::factory()->create(['name' => 'Flutter', 'slug' => 'flutter']);

    $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'title' => 'Another Flutter question',
        'body' => 'Body.',
        'tags' => ['flutter'],
    ])->assertCreated();

    expect(ForumTag::where('name', 'Flutter')->count())->toBe(1);
});

it('blocks new posts once an instructor locks the thread', function (): void {
    ['student' => $student, 'instructor' => $instructor, 'course' => $course] = setUpForumCourseWithStudent();

    $thread = ForumThread::factory()->create([
        'forum_id' => app(ForumService::class)->forCourse($course)->id,
        'created_by' => $student->id,
    ]);

    $this->actingAs($instructor)->patchJson("/api/v1/forum-threads/{$thread->id}", ['is_locked' => true])->assertOk();

    $response = $this->actingAs($student)->postJson("/api/v1/forum-threads/{$thread->id}/posts", ['body' => 'Reply']);

    $response->assertForbidden();
});

it('denies a student from pinning or locking a discussion', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();

    $thread = ForumThread::factory()->create([
        'forum_id' => app(ForumService::class)->forCourse($course)->id,
        'created_by' => $student->id,
    ]);

    $response = $this->actingAs($student)->patchJson("/api/v1/forum-threads/{$thread->id}", ['is_pinned' => true]);

    $response->assertForbidden();
});

it('lets an instructor mark a discussion solved and notifies its author, but denies the author from doing it themselves', function (): void {
    ['student' => $student, 'instructor' => $instructor, 'course' => $course] = setUpForumCourseWithStudent();

    $thread = ForumThread::factory()->create([
        'forum_id' => app(ForumService::class)->forCourse($course)->id,
        'created_by' => $student->id,
    ]);

    $selfAttempt = $this->actingAs($student)->patchJson("/api/v1/forum-threads/{$thread->id}", ['solved' => true]);
    $selfAttempt->assertForbidden();

    $response = $this->actingAs($instructor)->patchJson("/api/v1/forum-threads/{$thread->id}", ['solved' => true]);
    $response->assertOk();
    $response->assertJsonPath('data.solved', true);

    expect(Notification::where('user_id', $student->id)->where('type', 'forum_thread_solved')->exists())->toBeTrue();
});

it('bumps last_activity_at when a reply is posted, but not on an edit', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();

    $created = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'title' => 'Activity test',
        'body' => 'Original.',
    ])->assertCreated();
    $threadId = $created->json('data.id');
    $originalActivity = ForumThread::find($threadId)->last_activity_at;

    $this->travel(1)->hours();

    $this->actingAs($student)->postJson("/api/v1/forum-threads/{$threadId}/posts", ['body' => 'A reply.'])
        ->assertCreated();

    expect(ForumThread::find($threadId)->last_activity_at->gt($originalActivity))->toBeTrue();
});

it('marks a discussion read on open, flipping unread to false on the next list fetch', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();
    $otherStudent = User::factory()->student()->create();
    app(EnrolmentService::class)->enrol($otherStudent, $course, EnrolmentSource::Self);

    $created = $this->actingAs($otherStudent)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'title' => 'Unread test',
        'body' => 'Body.',
    ])->assertCreated();
    $threadId = $created->json('data.id');

    $beforeOpen = $this->actingAs($student)->getJson("/api/v1/courses/{$course->id}/forum/threads");
    expect($beforeOpen->json('data.0.unread'))->toBeTrue();

    $this->actingAs($student)->getJson("/api/v1/forum-threads/{$threadId}")->assertOk();

    $afterOpen = $this->actingAs($student)->getJson("/api/v1/courses/{$course->id}/forum/threads");
    expect($afterOpen->json('data.0.unread'))->toBeFalse();
});

it('paginates replies separately from the discussion, oldest first, excluding the head post', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();

    $created = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'title' => 'Reply pagination',
        'body' => 'Head post.',
    ])->assertCreated();
    $threadId = $created->json('data.id');

    foreach (range(1, 3) as $i) {
        $this->actingAs($student)->postJson("/api/v1/forum-threads/{$threadId}/posts", ['body' => "Reply {$i}"])
            ->assertCreated();
    }

    $replies = $this->actingAs($student)->getJson("/api/v1/forum-threads/{$threadId}/posts");
    $replies->assertOk();
    expect($replies->json('data'))->toHaveCount(3);
    expect($replies->json('data.0.body'))->toBe('Reply 1');
    expect(collect($replies->json('data'))->pluck('body'))->not->toContain('Head post.');
});

it('lets a student report a post and only staff can see or resolve the moderation queue', function (): void {
    ['student' => $student, 'instructor' => $instructor, 'course' => $course] = setUpForumCourseWithStudent();

    $thread = ForumThread::factory()->create([
        'forum_id' => app(ForumService::class)->forCourse($course)->id,
        'created_by' => $student->id,
    ]);
    $post = ForumPost::factory()->for($thread, 'thread')->create();

    $report = $this->actingAs($student)->postJson("/api/v1/forum-posts/{$post->id}/reports", ['reason' => 'Spam content']);
    $report->assertCreated();
    $reportId = $report->json('data.id');

    $studentQueue = $this->actingAs($student)->getJson("/api/v1/courses/{$course->id}/forum/reports");
    $studentQueue->assertForbidden();

    $staffQueue = $this->actingAs($instructor)->getJson("/api/v1/courses/{$course->id}/forum/reports");
    $staffQueue->assertOk();
    expect($staffQueue->json('data'))->toHaveCount(1);

    $resolve = $this->actingAs($instructor)->patchJson("/api/v1/forum-post-reports/{$reportId}", ['status' => 'dismissed']);
    $resolve->assertOk();
    $resolve->assertJsonPath('data.status', 'dismissed');
});
