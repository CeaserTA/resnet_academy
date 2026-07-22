<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Business rule "Notifications system": the read/unread in-app inbox. Every write path is
 * NotificationDispatcher (app/Services/Notifications) — this controller only ever reads and
 * flips is_read for the authenticated user's own rows.
 */
final class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = Notification::query()
            ->where('user_id', $request->user()->id)
            ->latest('id')
            ->paginate(20);

        return response()->json([
            'data' => NotificationResource::collection($notifications)->resolve($request),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'unread_count' => Notification::query()->where('user_id', $request->user()->id)->where('is_read', false)->count(),
            ],
        ]);
    }

    public function markRead(Request $request, Notification $notification): Response
    {
        abort_unless($notification->user_id === $request->user()->id, 403);

        $notification->update(['is_read' => true]);

        return response()->noContent();
    }

    public function markAllRead(Request $request): Response
    {
        Notification::query()->where('user_id', $request->user()->id)->where('is_read', false)->update(['is_read' => true]);

        return response()->noContent();
    }
}
