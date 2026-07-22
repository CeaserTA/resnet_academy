<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
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
}
