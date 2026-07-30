<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Module;
use App\Services\Audit\AuditLogger;
use Illuminate\Console\Command;

/**
 * A soft-deleted module's resources/module_items were never touched (soft-delete doesn't
 * cascade), so `forceDelete()` here is the moment the existing `cascadeOnDelete()` foreign keys
 * actually fire and permanently remove them — this is the real, final deletion, 30 days after
 * the user-facing one.
 */
final class PurgeSoftDeletedModules extends Command
{
    protected $signature = 'modules:purge-soft-deleted';

    protected $description = 'Permanently delete modules that have been soft-deleted for more than 30 days';

    public function handle(AuditLogger $auditLogger): int
    {
        $modules = Module::onlyTrashed()->where('deleted_at', '<=', now()->subDays(30))->get();

        foreach ($modules as $module) {
            $auditLogger->log(
                action: 'module.purged',
                entityType: 'module',
                entityId: $module->id,
                actorId: null,
                meta: ['title' => $module->title],
            );

            $module->forceDelete();
        }

        $this->info("Permanently purged {$modules->count()} module(s).");

        return self::SUCCESS;
    }
}
