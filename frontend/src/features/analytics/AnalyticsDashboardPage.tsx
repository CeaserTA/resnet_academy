import { Link, useParams } from 'react-router';
import { AlertTriangle, ArrowLeft, TrendingUp, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useCourseAnalytics } from '@/features/analytics/useAnalytics';
import { useCourse } from '@/features/catalogue/useCourses';

const eventTypeLabels: Record<string, string> = {
    resource_viewed: 'Resources viewed',
    assignment_submitted: 'Assignments submitted',
    quiz_attempted: 'Quizzes attempted',
};

/**
 * Business rule "Analytics dashboard": completion rates, at-risk student flags, engagement
 * metrics — admin/instructor only, course-scoped.
 */
export function AnalyticsDashboardPage() {
    const { id } = useParams();
    const courseId = Number(id);
    const { data: course } = useCourse(courseId);
    const { data: analytics, isLoading } = useCourseAnalytics(courseId);

    if (isLoading || !analytics) {
        return <Spinner />;
    }

    return (
        <div className="mx-auto max-w-3xl">
            <Link to="/admin/courses" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to courses
            </Link>

            <h1 className="mt-2 text-2xl">{course?.title} — analytics</h1>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                    <div className="flex items-center gap-2 text-ink-600">
                        <Users className="size-4" aria-hidden="true" />
                        <span className="text-sm">Enrolled students</span>
                    </div>
                    <p className="mt-2 font-mono text-2xl text-ink-900">{analytics.total_students}</p>
                </Card>

                <Card>
                    <div className="flex items-center gap-2 text-ink-600">
                        <TrendingUp className="size-4" aria-hidden="true" />
                        <span className="text-sm">Completion rate</span>
                    </div>
                    <p className="mt-2 font-mono text-2xl text-ink-900">{analytics.completion_rate}%</p>
                    <ProgressBar percent={analytics.completion_rate} className="mt-2" />
                    <p className="mt-1 text-xs text-ink-600">
                        {analytics.completed_students} of {analytics.total_students} completed
                    </p>
                </Card>

                <Card>
                    <div className="flex items-center gap-2 text-ink-600">
                        <AlertTriangle className="size-4" aria-hidden="true" />
                        <span className="text-sm">At-risk students</span>
                    </div>
                    <p className="mt-2 font-mono text-2xl text-ink-900">{analytics.at_risk_students.length}</p>
                </Card>
            </div>

            <h2 className="mt-8 text-lg">Engagement (last 30 days)</h2>
            <div className="mt-3 flex flex-wrap gap-3">
                {Object.entries(analytics.engagement_summary).length === 0 && (
                    <p className="text-sm text-ink-600">No engagement recorded yet.</p>
                )}
                {Object.entries(analytics.engagement_summary).map(([eventType, count]) => (
                    <Card key={eventType} className="flex-1 min-w-[160px]">
                        <p className="text-sm text-ink-600">{eventTypeLabels[eventType] ?? eventType}</p>
                        <p className="mt-1 font-mono text-xl text-ink-900">{count}</p>
                    </Card>
                ))}
            </div>

            <h2 className="mt-8 text-lg">At-risk students</h2>
            <p className="mt-1 text-sm text-ink-600">
                Enrolled more than a week ago, not yet completed, and no activity in the last two weeks.
            </p>

            <div className="mt-3 flex flex-col gap-2">
                {analytics.at_risk_students.map((entry) => (
                    <Card key={entry.student.id} className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-ink-900">{entry.student.name}</p>
                            <p className="text-sm text-ink-600">{entry.student.email}</p>
                        </div>
                        <div className="text-right">
                            <Badge label="At risk" tone="danger" icon={AlertTriangle} />
                            <p className="mt-1 text-xs text-ink-600">
                                {entry.last_engaged_at
                                    ? `Last active ${new Date(entry.last_engaged_at).toLocaleDateString()}`
                                    : 'Never engaged'}
                            </p>
                        </div>
                    </Card>
                ))}

                {analytics.at_risk_students.length === 0 && (
                    <EmptyState icon={Users} title="No at-risk students" description="Everyone is on track." />
                )}
            </div>
        </div>
    );
}
