import { Link, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { useAttendanceRoster } from '@/features/progress/useProgress';

/**
 * Business rule "Attendance tracking": who showed up to a live_session resource, for the
 * course's instructor/admin.
 */
export function AttendanceRosterPage() {
    const { id } = useParams();
    const resourceId = Number(id);

    const { data: roster, isLoading } = useAttendanceRoster(resourceId);

    if (isLoading) {
        return <Spinner />;
    }

    return (
        <div className="mx-auto max-w-2xl">
            <Link to="/admin/courses" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to courses
            </Link>

            <h1 className="mt-2 text-2xl">Attendance</h1>

            <div className="mt-6 overflow-x-auto rounded-lg border border-surface-100 bg-surface-0">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-surface-100 text-left">
                        <tr>
                            <th className="px-4 py-2 font-medium text-ink-600">Student</th>
                            <th className="px-4 py-2 font-medium text-ink-600">Status</th>
                            <th className="px-4 py-2 text-right font-medium text-ink-600">Marked at</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(roster ?? []).map((entry, index) => (
                            <tr key={entry.student.id} className={index % 2 === 1 ? 'bg-surface-50' : undefined}>
                                <td className="px-4 py-3">
                                    <p className="font-medium text-ink-900">{entry.student.name}</p>
                                    <p className="text-xs text-ink-600">{entry.student.email}</p>
                                </td>
                                <td className="px-4 py-3">
                                    {entry.attended ? (
                                        <Badge label="Attended" tone="success" icon={CheckCircle2} />
                                    ) : (
                                        <Badge label="Absent" tone="neutral" icon={XCircle} />
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-xs text-ink-600">
                                    {entry.marked_at ? new Date(entry.marked_at).toLocaleString() : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
