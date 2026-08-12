<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\EnrolmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Forum;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ForumController provides a unified index of all forums accessible to the authenticated user.
 * Returns forums from all courses the user is enrolled in, with recent activity metadata.
 */
final class ForumController extends Controller
{
    /**
     * GET /api/v1/forums
     *
     * Returns all forums for courses the authenticated user is enrolled in (confirmed status),
     * along with recent activity data for each forum.
     *
     * Response includes:
     * - Forum ID, title, course ID, course title
     * - Thread count
     * - Latest thread title and timestamp
     * - Unread thread count for the user
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Get all confirmed enrolments for the user
        $enrolledCourseIds = $user->enrolments()
            ->where('status', EnrolmentStatus::Confirmed)
            ->pluck('course_id');

        // If no enrolments, return empty array
        if ($enrolledCourseIds->isEmpty()) {
            return response()->json([]);
        }

        // Get forums for enrolled courses with activity data
        $forums = Forum::query()
            ->whereIn('course_id', $enrolledCourseIds)
            ->with(['course:id,title,slug', 'threads' => function ($query) {
                $query->latest('last_activity_at')->limit(1);
            }])
            ->withCount('threads')
            ->get()
            ->map(function (Forum $forum) use ($user) {
                $latestThread = $forum->threads->first();

                // Count unread threads for this forum
                $unreadCount = DB::table('forum_threads')
                    ->where('forum_id', $forum->id)
                    ->where(function ($query) use ($user) {
                        // Thread is unread if no read record exists OR last_activity_at > last_read_at
                        $query->whereNotExists(function ($subQuery) use ($user) {
                            $subQuery->select(DB::raw(1))
                                ->from('forum_thread_reads')
                                ->whereColumn('forum_thread_reads.thread_id', 'forum_threads.id')
                                ->where('forum_thread_reads.user_id', $user->id);
                        })
                        ->orWhereExists(function ($subQuery) use ($user) {
                            $subQuery->select(DB::raw(1))
                                ->from('forum_thread_reads')
                                ->whereColumn('forum_thread_reads.thread_id', 'forum_threads.id')
                                ->where('forum_thread_reads.user_id', $user->id)
                                ->whereColumn('forum_threads.last_activity_at', '>', 'forum_thread_reads.last_read_at');
                        });
                    })
                    ->count();

                return [
                    'id' => $forum->id,
                    'title' => $forum->title,
                    'course' => [
                        'id' => $forum->course->id,
                        'title' => $forum->course->title,
                        'slug' => $forum->course->slug,
                    ],
                    'thread_count' => $forum->threads_count,
                    'unread_count' => $unreadCount,
                    'latest_thread' => $latestThread ? [
                        'id' => $latestThread->id,
                        'title' => $latestThread->title,
                        'last_activity_at' => $latestThread->last_activity_at?->toISOString(),
                    ] : null,
                ];
            });

        return response()->json($forums);
    }
}

