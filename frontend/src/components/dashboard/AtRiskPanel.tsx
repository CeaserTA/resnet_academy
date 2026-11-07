import { Link } from 'react-router';
import { DashboardPanel, ViewAllLink } from '@/components/dashboard/DashboardPanel';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { formatRelativeTime } from '@/lib/utils';
import { worstAtRiskCourse, type AtRiskEntry } from '@/lib/atRisk';

/** At-risk list shared by the admin and instructor dashboards; rows open the course's gradebook. */
export function AtRiskPanel({ entries, isLoading, limit = 6, className }: { entries: AtRiskEntry[]; isLoading: boolean; limit?: number; className?: string }) {
    const worst = worstAtRiskCourse(entries);

    return (
        <DashboardPanel
            title={entries.length > 0 ? `At-risk students (${entries.length})` : 'At-risk students'}
            action={worst && <ViewAllLink to={`/admin/courses/${worst.id}/gradebook`} label="Gradebook" />}
            className={className}
        >
            {isLoading ? (
                <div className="flex justify-center py-6"><Spinner /></div>
            ) : entries.length === 0 ? (
                <p className="px-4 py-5 text-center text-sm text-ink-600">Everyone is on track.</p>
            ) : (
                <ul className="divide-y divide-surface-100">
                    {entries.slice(0, limit).map((entry) => (
                        <li key={`${entry.course.id}-${entry.student.id}`}>
                            <Link
                                to={`/admin/courses/${entry.course.id}/gradebook`}
                                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-50"
                            >
                                <Avatar name={entry.student.name} size="sm" className="size-7 shrink-0 text-xs" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-ink-900">{entry.student.name}</span>
                                    <span className="block truncate text-xs text-ink-600">{entry.course.title}</span>
                                </span>
                                <span className="shrink-0 text-right">
                                    <span className="block text-xs font-medium text-accent-amber">{entry.risk_factor}</span>
                                    <span className="block text-[11px] text-ink-600">
                                        {entry.last_engaged_at ? `Active ${formatRelativeTime(entry.last_engaged_at)}` : 'Never active'}
                                    </span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </DashboardPanel>
    );
}
