<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\RejectCourseReviewRequest;
use App\Http\Requests\Api\V1\SetCourseReviewFeaturedRequest;
use App\Http\Requests\Api\V1\StoreCourseReviewRequest;
use App\Http\Resources\CourseReviewResource;
use App\Models\Course;
use App\Models\CourseReview;
use App\Services\Reviews\CourseReviewService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class CourseReviewController extends Controller
{
    public function __construct(private readonly CourseReviewService $courseReviewService) {}

    /**
     * Admin moderation queue — every review, optionally filtered by status.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', CourseReview::class);

        $reviews = CourseReview::query()
            ->with(['student', 'course', 'reviewer'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->orderBy('created_at', 'desc')
            ->get();

        return CourseReviewResource::collection($reviews);
    }

    /**
     * The authenticated student's own reviews — drives "has this course already been reviewed"
     * checks on the completion prompt and My Courses banner.
     */
    public function mine(Request $request): AnonymousResourceCollection
    {
        $reviews = CourseReview::query()
            ->where('student_id', $request->user()->id)
            ->with(['course'])
            ->orderBy('created_at', 'desc')
            ->get();

        return CourseReviewResource::collection($reviews);
    }

    /**
     * Public, unauthenticated — approved reviews for the landing page / testimonials, optionally
     * only featured ones.
     */
    public function publicIndex(Request $request): AnonymousResourceCollection
    {
        $perPage = min($request->integer('per_page', 20), 50);

        $reviews = CourseReview::query()
            ->where('status', ReviewStatus::Approved)
            ->when($request->boolean('featured'), fn ($query) => $query->where('is_featured', true))
            ->with(['student', 'course'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return CourseReviewResource::collection($reviews);
    }

    public function store(StoreCourseReviewRequest $request, Course $course): CourseReviewResource
    {
        $review = $this->courseReviewService->submit(
            student: $request->user(),
            course: $course,
            rating: $request->validated('rating'),
            reviewText: $request->validated('review_text'),
        );

        return new CourseReviewResource($review->load(['student', 'course']));
    }

    public function approve(Request $request, CourseReview $review): CourseReviewResource
    {
        $this->authorize('approve', CourseReview::class);

        $review = $this->courseReviewService->approve($review, $request->user());

        return new CourseReviewResource($review->load(['student', 'course', 'reviewer']));
    }

    public function reject(RejectCourseReviewRequest $request, CourseReview $review): CourseReviewResource
    {
        $review = $this->courseReviewService->reject($review, $request->user(), $request->validated('admin_notes'));

        return new CourseReviewResource($review->load(['student', 'course', 'reviewer']));
    }

    public function feature(SetCourseReviewFeaturedRequest $request, CourseReview $review): CourseReviewResource
    {
        $review = $this->courseReviewService->setFeatured($review, $request->user(), $request->validated('is_featured'));

        return new CourseReviewResource($review->load(['student', 'course', 'reviewer']));
    }
}
