<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Business rule "Audit logging": answers "who verified/enrolled a student, who changed a
 * grade" — read-only, `AuditLogger` (app/Services/Audit) remains the only write path.
 */
final class AuditLogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', User::class);

        $logs = AuditLog::query()
            ->when($request->filled('entity_type'), fn ($query) => $query->where('entity_type', $request->string('entity_type')))
            ->when($request->filled('entity_id'), fn ($query) => $query->where('entity_id', $request->integer('entity_id')))
            ->when($request->filled('action'), fn ($query) => $query->where('action', $request->string('action')))
            ->with('actor')
            ->latest('id')
            ->paginate(50);

        return AuditLogResource::collection($logs);
    }
}
