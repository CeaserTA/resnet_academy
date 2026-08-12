import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { describeAuditLogEntry } from '@/lib/auditLog';

import { useAuditLogs } from '@/features/analytics/useAnalytics';

/**
 * Business rule "Audit logging" — answers "who verified/enrolled a student, who changed a
 * grade." Admin only.
 */
export function AuditLogPage() {
    const [entityType, setEntityType] = useState('');
    const [action, setAction] = useState('');
    const { data, isLoading } = useAuditLogs({ entity_type: entityType || undefined, action: action || undefined });

    const logs = data?.data ?? [];

    return (
        <div className="space-y-4">
            {/* Page header */}
            <div>
                <h1 className="text-lg font-semibold text-ink-900">Audit log</h1>
                <p className="text-xs text-ink-400">Track who changed what, and when.</p>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                    label="Filter by entity type"
                    placeholder="e.g. enrolment, user, assignment_submission"
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                />
                <Input
                    label="Filter by action"
                    placeholder="e.g. grade.changed"
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                />
            </div>

            {isLoading && <Spinner />}

            {!isLoading && logs.length === 0 && (
                <EmptyState icon={ClipboardList} title="No audit entries" description="Nothing matches these filters." className="mt-6" />
            )}

            {!isLoading && logs.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_160px] items-center gap-2 border-b border-surface-100 bg-surface-50 px-4 py-2.5">
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Event</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600 text-right">When</span>
                    </div>

                    {/* Rows */}
                    <ul className="divide-y divide-surface-100">
                        {logs.map((log) => (
                            <li
                                key={log.id}
                                className="grid grid-cols-[1fr_160px] items-center gap-2 px-4 py-3 transition-colors hover:bg-surface-50"
                            >
                                <div>
                                    <p className="text-sm text-ink-900">{describeAuditLogEntry(log)}</p>
                                    <p className="mt-0.5 font-mono text-xs text-ink-400">
                                        {log.action} · {log.entity_type} #{log.entity_id}
                                    </p>
                                </div>
                                <p className="text-right font-mono text-xs text-ink-400">
                                    {new Date(log.created_at).toLocaleString()}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
