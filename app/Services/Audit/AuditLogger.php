<?php

declare(strict_types=1);

namespace App\Services\Audit;

use App\Models\AuditLog;

/**
 * Single write path for audit_logs, per ai-workflow-rules.md §9 — every sensitive mutation
 * (enrolment status changes, grade changes, role changes) goes through here.
 */
final class AuditLogger
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public function log(string $action, string $entityType, int $entityId, ?int $actorId, array $meta = []): AuditLog
    {
        return AuditLog::create([
            'actor_id' => $actorId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'meta' => $meta,
        ]);
    }
}
