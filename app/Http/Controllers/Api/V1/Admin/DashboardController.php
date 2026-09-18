<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\ResourceLiveSession;
use App\Models\User;
use App\Services\Analytics\AnalyticsService;
use Illuminate\Http\JsonResponse;

/**
 * Admin dashboard: system-wide counts. Same admin-only gate as the other `/admin/*` read
 * endpoints (`AuditLogController`, `UserController::index`).
 */
final class DashboardController extends Controller
{
    public function __construct(private readonly AnalyticsService $analyticsService) {}

    public function summary(): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $summary = $this->analyticsService->systemSummary();
        $summary['recent_audit_logs'] = AuditLogResource::collection($summary['recent_audit_logs']);

        return response()->json(['data' => $summary]);
    }

    /**
     * The past live sessions with no recording attached. Each one is a required module item that
     * can no longer be attended, so it blocks every student who did not join at the time. Pairs
     * with the `live_sessions_missing_recording` count on the summary above: the count tells an
     * admin something needs doing, this tells them which sessions.
     */
    public function liveSessionsMissingRecordings(): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $rows = ResourceLiveSession::query()
            ->whereNull('recording_url')
            ->with('resource.module.course')
            ->get()
            ->filter(fn (ResourceLiveSession $session): bool => $session->isMissingRecording())
            ->sortBy(fn (ResourceLiveSession $session) => $session->scheduled_at)
            ->map(fn (ResourceLiveSession $session): array => [
                'resource_id' => $session->resource_id,
                'title' => $session->resource?->title,
                'provider' => $session->provider?->value,
                'scheduled_at' => $session->scheduled_at->toIso8601String(),
                'ended_at' => $session->endsAt()->toIso8601String(),
                'module' => [
                    'id' => $session->resource?->module?->id,
                    'title' => $session->resource?->module?->title,
                ],
                'course' => [
                    'id' => $session->resource?->module?->course?->id,
                    'title' => $session->resource?->module?->course?->title,
                ],
            ])
            ->values();

        return response()->json(['data' => $rows]);
    }
}
