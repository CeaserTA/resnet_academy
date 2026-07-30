import { useState } from 'react';
import { ChevronDown, ChevronRight, RotateCcw, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useRestoreModule, useTrashedModules } from '@/features/courseStructure/useCourseStructure';
import { formatRelativeTime } from '@/lib/utils';

const RETENTION_DAYS = 30;

function daysUntilPurge(deletedAt: string): number {
    const daysSinceDeleted = (Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(RETENTION_DAYS - daysSinceDeleted));
}

/**
 * A module's resources/module_items are never actually touched by a soft-delete (no cascade
 * fires until the 30-day purge), so the item count shown here is exactly what will come back on
 * restore — reassurance for the exact "did I lose my resources too" worry that motivated this.
 */
export function TrashedModulesSection({ courseId }: { courseId: number }) {
    const [isOpen, setIsOpen] = useState(false);
    const { data: trashedModules } = useTrashedModules(courseId);
    const restoreModule = useRestoreModule(courseId);

    if (!trashedModules || trashedModules.length === 0) {
        return null;
    }

    return (
        <Card className="mt-6">
            <button
                onClick={() => setIsOpen((v) => !v)}
                className="flex w-full items-center gap-2 text-left"
                aria-expanded={isOpen}
            >
                {isOpen ? (
                    <ChevronDown className="size-4 shrink-0 text-ink-600" aria-hidden="true" />
                ) : (
                    <ChevronRight className="size-4 shrink-0 text-ink-600" aria-hidden="true" />
                )}
                <Trash2 className="size-4 shrink-0 text-ink-600" aria-hidden="true" />
                <h2 className="text-lg text-ink-900">Recently deleted ({trashedModules.length})</h2>
            </button>

            {isOpen && (
                <div className="mt-4 flex flex-col gap-2">
                    {trashedModules.map((module) => (
                        <div
                            key={module.id}
                            className="flex items-center justify-between gap-3 rounded-md border border-surface-100 px-3 py-2"
                        >
                            <div className="flex min-w-0 flex-col gap-1">
                                <span className="truncate text-sm font-medium text-ink-900">{module.title}</span>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
                                    <span>
                                        {module.items.length} {module.items.length === 1 ? 'item' : 'items'} attached
                                    </span>
                                    <span>&middot;</span>
                                    <span>Deleted {module.deleted_at ? formatRelativeTime(module.deleted_at) : 'recently'}</span>
                                    {module.deleted_at && (
                                        <Badge label={`Purges in ${daysUntilPurge(module.deleted_at)}d`} tone="warning" />
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="secondary"
                                onClick={() => restoreModule.mutate(module.id)}
                                isLoading={restoreModule.isPending}
                                className="shrink-0"
                            >
                                <RotateCcw className="size-4" aria-hidden="true" />
                                Restore
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
