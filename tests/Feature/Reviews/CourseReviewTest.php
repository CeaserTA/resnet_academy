<?php

declare(strict_types=1);

use App\Enums\ReviewStatus;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\CourseReview;
use App\Models\User;
use App\Services\Analytics\AnalyticsService;

it('rejects a review submission with no completed enrolment', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();

    $response = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/reviews", ['rating' => 5]);

    $response->assertUnprocessable();
    expect(CourseReview::query()->count())->toBe(0);
});

it('rejects a review submission from a guest', function (): void {
    $course = Course::factory()->create();

    $response = $this->postJson("/api/v1/courses/{$course->id}/reviews", ['rating' => 5]);

    $response->assertUnauthorized();
});

it('submits a review for a completed course', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    Certificate::factory()->for($student, 'student')->for($course, 'course')->create();

    $response = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/reviews", [
        'rating' => 4,
        'review_text' => 'Really enjoyed this course.',
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('course_reviews', [
        'student_id' => $student->id,
        'course_id' => $course->id,
        'rating' => 4,
        'status' => 'pending',
    ]);
});

it('edits the existing review in place on resubmission instead of creating a duplicate', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    Certificate::factory()->for($student, 'student')->for($course, 'course')->create();
    $review = CourseReview::factory()->for($student, 'student')->for($course, 'course')->create(['rating' => 2]);

    $response = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/reviews", ['rating' => 5]);

    $response->assertOk();
    expect(CourseReview::query()->count())->toBe(1);
    expect($review->fresh()->rating)->toBe(5);
});

it('blocks resubmission once a review has already been approved', function (): void {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    Certificate::factory()->for($student, 'student')->for($course, 'course')->create();
    CourseReview::factory()->approved()->for($student, 'student')->for($course, 'course')->create();

    $response = $this->actingAs($student)->postJson("/api/v1/courses/{$course->id}/reviews", ['rating' => 5]);

    $response->assertUnprocessable();
});

it('lets an admin approve, reject, and feature a review', function (): void {
    $admin = User::factory()->admin()->create();
    $review = CourseReview::factory()->create();

    $this->actingAs($admin)->postJson("/api/v1/admin/reviews/{$review->id}/approve")->assertOk();
    expect($review->fresh()->status)->toBe(ReviewStatus::Approved);
    expect($review->fresh()->reviewed_by)->toBe($admin->id);

    $this->actingAs($admin)->postJson("/api/v1/admin/reviews/{$review->id}/feature", ['is_featured' => true])->assertOk();
    expect($review->fresh()->is_featured)->toBeTrue();

    $other = CourseReview::factory()->create();
    $this->actingAs($admin)->postJson("/api/v1/admin/reviews/{$other->id}/reject", ['admin_notes' => 'Spam'])->assertOk();
    expect($other->fresh()->status)->toBe(ReviewStatus::Rejected);
    expect($other->fresh()->admin_notes)->toBe('Spam');
});

it('blocks featuring a review that is not approved', function (): void {
    $admin = User::factory()->admin()->create();
    $review = CourseReview::factory()->create();

    $response = $this->actingAs($admin)->postJson("/api/v1/admin/reviews/{$review->id}/feature", ['is_featured' => true]);

    $response->assertUnprocessable();
});

it('denies students from moderating reviews', function (): void {
    $student = User::factory()->student()->create();
    $review = CourseReview::factory()->create();

    $this->actingAs($student)->getJson('/api/v1/admin/reviews')->assertForbidden();
    $this->actingAs($student)->postJson("/api/v1/admin/reviews/{$review->id}/approve")->assertForbidden();
});

it('only returns approved reviews on the public endpoint, honouring the featured filter', function (): void {
    CourseReview::factory()->create();
    CourseReview::factory()->rejected()->create();
    $approved = CourseReview::factory()->approved()->create();
    $featured = CourseReview::factory()->approved()->featured()->create();

    $response = $this->getJson('/api/v1/reviews');
    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->toHaveCount(2)->toContain($approved->id, $featured->id);

    $featuredResponse = $this->getJson('/api/v1/reviews?featured=1');
    $featuredIds = collect($featuredResponse->json('data'))->pluck('id');
    expect($featuredIds)->toEqual(collect([$featured->id]));
});

it('includes pending_reviews in the analytics system summary', function (): void {
    CourseReview::factory()->count(2)->create();
    CourseReview::factory()->approved()->create();

    $summary = app(AnalyticsService::class)->systemSummary();

    expect($summary['pending_reviews'])->toBe(2);
});
