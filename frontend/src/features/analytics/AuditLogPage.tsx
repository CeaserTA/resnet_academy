import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { describeAuditLogEntry } from '@/lib/auditLog';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';

import { useAuditLogs } from '@/features/analytics/useAnalytics';

/**
 * Business rule "Audit logging" — answers "who verified/enrolled a student, who changed a
 * grade." Admin only.
 */
export function AuditLogPage() {
    usePageHeader('Audit log', 'Track who changed what, and when.');
    const [entityType, setEntityType] = useState('');
    const [action, setAction] = useState('');
    const [page, setPage] = useState(1);

    // Query once typing pauses rather than on every keystroke.
    const debouncedEntityType = useDebouncedValue(entityType.trim());
    const debouncedAction = useDebouncedValue(action.trim());
    const { data, isLoading } = useAuditLogs({
        entity_type: debouncedEntityType || undefined,
        action: debouncedAction || undefined,
        page,
    });

    const logs = data?.data ?? [];

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                    label="Filter by entity type"
                    placeholder="e.g. enrolment, user, assignment_submission"
                    value={entityType}
                    onChange={(e) => {
                        setEntityType(e.target.value);
                        setPage(1);
                    }}
                />
                <Input
                    label="Filter by action"
                    placeholder="e.g. grade.changed"
                    value={action}
                    onChange={(e) => {
                        setAction(e.target.value);
                        setPage(1);
                    }}
                />
            </div>

            {isLoading && <Spinner />}

            {!isLoading && logs.length === 0 && (
                <EmptyState icon={ClipboardList} title="No audit entries" description="Nothing matches these filters." className="mt-6" />
            )}

            {!isLoading && logs.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                    {/* Column headers */}
                    <div className="grid grid-cols-1 items-center gap-2 border-b border-surface-100 sm:grid-cols-[1fr_160px] bg-surface-50 px-4 py-2.5">
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Event</span>
                        <span className="hidden text-right text-xs font-medium uppercase tracking-wide text-ink-600 sm:block">When</span>
                    </div>

                    {/* Rows */}
                    <ul className="divide-y divide-surface-100">
                        {logs.map((log) => (
                            <li
                                key={log.id}
                                className="grid grid-cols-1 items-center gap-1 px-4 py-3 transition-colors hover:bg-surface-50 sm:grid-cols-[1fr_160px] sm:gap-2"
                            >
                                <div>
                                    <p className="text-sm text-ink-900">{describeAuditLogEntry(log)}</p>
                                    <p className="mt-0.5 font-mono text-xs text-ink-600">
                                        {log.action} · {log.entity_type} #{log.entity_id}
                                    </p>
                                </div>
                                <p className="font-mono text-xs text-ink-600 sm:text-right">
                                    {new Date(log.created_at).toLocaleString()}
                                </p>
                            </li>
                        ))}
                    </ul>

                    {data && <Pagination meta={data.meta} onPageChange={setPage} itemLabel="entries" />}
                </div>
            )}
        </div>
    );
}
