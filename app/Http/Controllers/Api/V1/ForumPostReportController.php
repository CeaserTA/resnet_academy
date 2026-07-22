<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\ForumPostReportStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreForumPostReportRequest;
use App\Http\Requests\Api\V1\UpdateForumPostReportRequest;
use App\Http\Resources\ForumPostReportResource;
use App\Models\Course;
use App\Models\ForumPost;
use App\Models\ForumPostReport;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class ForumPostReportController extends Controller
{
    public function store(StoreForumPostReportRequest $request, ForumPost $post): ForumPostReportResource
    {
        $report = ForumPostReport::create([
            'post_id' => $post->id,
            'reported_by' => $request->user()->id,
            'reason' => $request->validated('reason'),
            'status' => ForumPostReportStatus::Pending,
        ]);

        return new ForumPostReportResource($report->load(['post.user', 'reporter']));
    }

    /**
     * The moderation queue — course-teaching instructor/admin only.
     */
    public function index(Course $course): AnonymousResourceCollection
    {
        $this->authorize('moderate', [ForumPostReport::class, $course]);

        $reports = ForumPostReport::query()
            ->whereHas('post.thread.forum', fn ($query) => $query->where('course_id', $course->id))
            ->with(['post.user', 'reporter'])
            ->latest('id')
            ->get();

        return ForumPostReportResource::collection($reports);
    }

    public function update(UpdateForumPostReportRequest $request, ForumPostReport $report): ForumPostReportResource
    {
        $report->update(['status' => $request->validated('status')]);

        return new ForumPostReportResource($report->load(['post.user', 'reporter']));
    }
}
