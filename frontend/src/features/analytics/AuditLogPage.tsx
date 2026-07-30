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
        <div>
            <h1 className="text-2xl">Audit log</h1>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <div className="mt-6 overflow-x-auto rounded-lg border border-surface-100 bg-surface-0">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-surface-100 text-left">
                            <tr>
                                <th className="px-4 py-2 font-medium text-ink-600">Event</th>
                                <th className="px-4 py-2 text-right font-medium text-ink-600">When</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log, index) => (
                                <tr key={log.id} className={index % 2 === 1 ? 'bg-surface-50' : undefined}>
                                    <td className="px-4 py-3">
                                        <p className="text-ink-900">{describeAuditLogEntry(log)}</p>
                                        <p className="mt-0.5 font-mono text-xs text-ink-600">
                                            {log.action} · {log.entity_type} #{log.entity_id}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-xs text-ink-600">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
