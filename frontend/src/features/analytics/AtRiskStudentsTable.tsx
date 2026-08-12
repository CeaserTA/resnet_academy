import { useState } from 'react';
import { AlertTriangle, Send } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useNotifyAtRiskStudents } from '@/features/analytics/useAnalytics';
import { formatRelativeTime } from '@/lib/utils';
import type { AtRiskStudent } from '@/lib/api/types';

export function AtRiskStudentsTable({ courseId, students }: { courseId: number; students: AtRiskStudent[] }) {
    const notifyAtRisk = useNotifyAtRiskStudents(courseId);
    const [sentCount, setSentCount] = useState<number | null>(null);

    const handleSendMassNotice = async () => {
        setSentCount(null);
        const { notified } = await notifyAtRisk.mutateAsync(undefined);
        setSentCount(notified);
    };

    return (
        <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-surface-100 bg-surface-50 px-4 py-3">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-danger-600" aria-hidden="true" />
                    <div>
                        <h2 className="text-sm font-semibold text-ink-900">At-risk students</h2>
                        <p className="text-xs text-ink-400">
                            {students.length} student{students.length !== 1 ? 's' : ''} flagged
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {sentCount !== null && (
                        <span className="text-xs text-ink-400">
                            Sent to {sentCount} student{sentCount === 1 ? '' : 's'}
                        </span>
                    )}
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void handleSendMassNotice()}
                        isLoading={notifyAtRisk.isPending}
                        disabled={students.length === 0}
                    >
                        <Send className="size-3.5" aria-hidden="true" />
                        Send notice
                    </Button>
                </div>
            </div>

            {students.length === 0 ? (
                <EmptyState
                    icon={AlertTriangle}
                    title="No at-risk students"
                    description="Everyone is on track."
                    className="py-8"
                />
            ) : (
                <>
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_80px_120px_auto] items-center gap-4 border-b border-surface-100 bg-surface-50 px-4 py-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Student</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Avg. grade</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Last active</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Risk factor</span>
                    </div>
                    <ul className="divide-y divide-surface-100">
                        {students.map((entry) => (
                            <li
                                key={entry.student.id}
                                className="grid grid-cols-[1fr_80px_120px_auto] items-center gap-4 px-4 py-3 hover:bg-surface-50"
                            >
                                {/* Student */}
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <Avatar name={entry.student.name} size="sm" className="size-7 shrink-0 text-xs" />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-ink-900">{entry.student.name}</p>
                                        <p className="truncate text-xs text-ink-400">{entry.student.email}</p>
                                    </div>
                                </div>
                                {/* Grade */}
                                <span className="font-mono text-sm text-ink-900">
                                    {entry.final_grade_percent !== null ? `${entry.final_grade_percent}%` : '—'}
                                </span>
                                {/* Last active */}
                                <span className="text-xs text-ink-600">
                                    {entry.last_engaged_at ? formatRelativeTime(entry.last_engaged_at) : 'Never'}
                                </span>
                                {/* Risk factor */}
                                <Badge label={entry.risk_factor} tone="danger" icon={AlertTriangle} />
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
