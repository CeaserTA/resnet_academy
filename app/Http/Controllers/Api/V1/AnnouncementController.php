<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreAnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Models\Announcement;
use App\Models\Course;
use App\Services\Notifications\NotificationDispatcher;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class AnnouncementController extends Controller
{
    public function __construct(private readonly NotificationDispatcher $notificationDispatcher) {}

    public function index(Course $course): AnonymousResourceCollection
    {
        $this->authorize('viewAny', [Announcement::class, $course]);

        $announcements = $course->announcements()->with('postedBy')->latest('id')->get();

        return AnnouncementResource::collection($announcements);
    }

    public function store(StoreAnnouncementRequest $request, Course $course): AnnouncementResource
    {
        $announcement = $course->announcements()->create([
            'posted_by' => $request->user()->id,
            'title' => $request->validated('title'),
            'body' => $request->validated('body'),
        ]);

        $this->notificationDispatcher->notifyAnnouncementPosted($announcement->load('course'));

        return new AnnouncementResource($announcement->load('postedBy'));
    }

    public function destroy(Announcement $announcement): Response
    {
        $this->authorize('delete', $announcement);

        $announcement->delete();

        return response()->noContent();
    }
}
