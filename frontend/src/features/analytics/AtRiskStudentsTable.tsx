import { useState } from 'react';
import { AlertTriangle, Send } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
        <Card>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="size-5 text-danger-600" aria-hidden="true" />
                    <h2 className="text-lg text-ink-900">At-Risk Students</h2>
                </div>

                <div className="flex items-center gap-3">
                    {sentCount !== null && (
                        <span className="text-xs text-ink-600">Sent to {sentCount} student{sentCount === 1 ? '' : 's'}</span>
                    )}
                    <Button
                        variant="secondary"
                        onClick={() => void handleSendMassNotice()}
                        isLoading={notifyAtRisk.isPending}
                        disabled={students.length === 0}
                    >
                        <Send className="size-4" aria-hidden="true" />
                        Send Mass Notice
                    </Button>
                </div>
            </div>

            {students.length === 0 ? (
                <EmptyState icon={AlertTriangle} title="No at-risk students" description="Everyone is on track." className="mt-4" />
            ) : (
                <div className="mt-4 overflow-x-auto rounded-lg border border-surface-100">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-100 text-left">
                            <tr>
                                <th className="px-4 py-2 font-medium text-ink-600">Student</th>
                                <th className="px-4 py-2 font-medium text-ink-600">Avg. Grade</th>
                                <th className="px-4 py-2 font-medium text-ink-600">Last Active</th>
                                <th className="px-4 py-2 font-medium text-ink-600">Risk Factor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((entry, index) => (
                                <tr key={entry.student.id} className={index % 2 === 1 ? 'bg-surface-50' : undefined}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Avatar name={entry.student.name} />
                                            <div>
                                                <p className="font-medium text-ink-900">{entry.student.name}</p>
                                                <p className="text-xs text-ink-600">{entry.student.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-ink-900">
                                        {entry.final_grade_percent !== null ? `${entry.final_grade_percent}%` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-ink-600">
                                        {entry.last_engaged_at ? formatRelativeTime(entry.last_engaged_at) : 'Never'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge label={entry.risk_factor} tone="danger" icon={AlertTriangle} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}
