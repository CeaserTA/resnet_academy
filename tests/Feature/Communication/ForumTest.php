<?php

declare(strict_types=1);

use App\Enums\EnrolmentSource;
use App\Models\Course;
use App\Models\ForumPost;
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

it('lets an enrolled student create a post and reply, notifying the post author', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();
    $otherStudentEnrolled = User::factory()->student()->create();
    app(EnrolmentService::class)->enrol($otherStudentEnrolled, $course, EnrolmentSource::Self);

    $thread = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'body' => 'Does anyone know when it unlocks?',
    ]);
    $thread->assertCreated();
    $threadId = $thread->json('data.id');

    $reply = $this->actingAs($otherStudentEnrolled)->postJson("/api/v1/forum-threads/{$threadId}/posts", [
        'body' => 'I think it unlocks next week.',
    ]);
    $reply->assertCreated();

    expect(Notification::where('user_id', $student->id)->where('type', 'forum_reply')->exists())->toBeTrue();
});

it('denies a student outside the course from posting in its forum', function (): void {
    ['course' => $course] = setUpForumCourseWithStudent();
    $outsider = User::factory()->student()->create();

    $response = $this->actingAs($outsider)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'body' => 'Should not work.',
    ]);

    $response->assertForbidden();
});

it('attaches an image to a post and exposes a downloadable url', function (): void {
    Storage::fake('public');
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();

    $response = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
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
        'body' => 'Big clip.',
        'attachment_type' => 'video',
        'attachment' => UploadedFile::fake()->create('clip.mp4', 6000, 'video/mp4'),
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors('attachment', responseKey: 'error.fields');
});

it('lets the author edit their own post body and swap its attachment', function (): void {
    Storage::fake('public');
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();

    $created = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'body' => 'Original body.',
        'attachment_type' => 'image',
        'attachment' => UploadedFile::fake()->create('first.jpg', 100, 'image/jpeg'),
    ])->assertCreated();

    $postId = $created->json('data.post.id');
    $originalPath = ForumPost::find($postId)->attachment_path;

    $updated = $this->actingAs($student)->postJson("/api/v1/forum-posts/{$postId}", [
        '_method' => 'PATCH',
        'body' => 'Edited body.',
        'attachment_type' => 'image',
        'attachment' => UploadedFile::fake()->create('second.jpg', 100, 'image/jpeg'),
    ]);

    $updated->assertOk();
    $updated->assertJsonPath('data.body', 'Edited body.');
    Storage::disk('public')->assertMissing($originalPath);
});

it('denies a non-owner from editing someone else\'s post', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();
    $otherStudent = User::factory()->student()->create();
    app(EnrolmentService::class)->enrol($otherStudent, $course, EnrolmentSource::Self);

    $created = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'body' => 'Original body.',
    ])->assertCreated();

    $response = $this->actingAs($otherStudent)->patchJson("/api/v1/forum-posts/{$created->json('data.post.id')}", [
        'body' => 'Hijacked.',
    ]);

    $response->assertForbidden();
});

it('deletes the whole thread and its replies when the head post is deleted', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();

    $created = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
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

it('deletes only a reply post, leaving the thread and other replies intact', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();

    $created = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'body' => 'Original body.',
    ])->assertCreated();
    $threadId = $created->json('data.id');

    $reply = $this->actingAs($student)->postJson("/api/v1/forum-threads/{$threadId}/posts", ['body' => 'A reply.'])
        ->assertCreated();

    $this->actingAs($student)->deleteJson("/api/v1/forum-posts/{$reply->json('data.id')}")->assertNoContent();

    expect(ForumThread::find($threadId))->not->toBeNull();
    expect(ForumPost::where('thread_id', $threadId)->count())->toBe(1);
});

it('scopes the "mine" filter to the caller\'s own posts', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();
    $otherStudent = User::factory()->student()->create();
    app(EnrolmentService::class)->enrol($otherStudent, $course, EnrolmentSource::Self);

    $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", ['body' => 'Mine.'])
        ->assertCreated();
    $this->actingAs($otherStudent)->postJson("/api/v1/courses/{$course->id}/forum/threads", ['body' => 'Not mine.'])
        ->assertCreated();

    $mine = $this->actingAs($student)->getJson("/api/v1/courses/{$course->id}/forum/threads?mine=1");
    $mine->assertOk();
    expect($mine->json('data'))->toHaveCount(1);
    expect($mine->json('data.0.post.body'))->toBe('Mine.');

    $feed = $this->actingAs($student)->getJson("/api/v1/courses/{$course->id}/forum/threads");
    expect($feed->json('data'))->toHaveCount(2);
});

it('searches post bodies via full-text', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();

    $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/forum/threads", [
        'body' => 'Let us talk about chlorophyll and sunlight absorption in plant cells.',
    ])->assertCreated();

    $noMatch = $this->actingAs($student)->getJson("/api/v1/courses/{$course->id}/forum/threads?search=xylophone");
    $noMatch->assertOk();
    expect($noMatch->json('data'))->toHaveCount(0);

    // The actual match path (whereFullText against forum_posts.body) is NOT exercised here:
    // InnoDB's FULLTEXT index isn't synchronously visible to a query inside the same
    // uncommitted transaction that inserted the row, and RefreshDatabase wraps every test in
    // exactly that — a transaction, rolled back afterward. Manually verified instead via
    // `php artisan tinker` against committed rows in the real dev database.
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

it('denies a student from pinning or locking a thread', function (): void {
    ['student' => $student, 'course' => $course] = setUpForumCourseWithStudent();

    $thread = ForumThread::factory()->create([
        'forum_id' => app(ForumService::class)->forCourse($course)->id,
        'created_by' => $student->id,
    ]);

    $response = $this->actingAs($student)->patchJson("/api/v1/forum-threads/{$thread->id}", ['is_pinned' => true]);

    $response->assertForbidden();
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
