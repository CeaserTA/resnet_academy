import { Link, useParams } from 'react-router';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useForumReports, useUpdateForumReport } from '@/features/communication/useCommunication';
import { forumPostReportStatusDisplay } from '@/lib/statusBadge';

export function ForumModerationPage() {
    const { id } = useParams();
    const courseId = Number(id);
    const { data: reports, isLoading } = useForumReports(courseId);
    const updateReport = useUpdateForumReport(courseId);

    if (isLoading) {
        return <Spinner />;
    }

    return (
        <div className="mx-auto max-w-2xl">
            <Link to={`/courses/${courseId}/forum`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to forum
            </Link>

            <h1 className="mt-2 text-2xl">Reported posts</h1>

            <div className="mt-6 flex flex-col gap-3">
                {(reports ?? []).map((report) => {
                    const status = forumPostReportStatusDisplay(report.status);

                    return (
                        <Card key={report.id}>
                            <div className="flex items-center justify-between">
                                <Badge label={status.label} tone={status.tone} icon={status.icon} />
                                <p className="text-xs text-ink-600">{new Date(report.created_at).toLocaleString()}</p>
                            </div>
                            <p className="mt-2 text-sm font-medium text-ink-900">Reason: {report.reason}</p>
                            <p className="mt-1 text-xs text-ink-600">Reported by {report.reporter?.name}</p>
                            <div className="mt-2 rounded-md bg-surface-50 p-2">
                                <p className="text-xs font-medium text-ink-900">{report.post.user?.name}</p>
                                <p className="text-sm text-ink-900">{report.post.body}</p>
                            </div>

                            {report.status === 'pending' && (
                                <div className="mt-3 flex gap-2">
                                    <Button
                                        variant="secondary"
                                        onClick={() => updateReport.mutate({ reportId: report.id, status: 'reviewed' })}
                                    >
                                        Mark reviewed
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => updateReport.mutate({ reportId: report.id, status: 'dismissed' })}
                                    >
                                        Dismiss
                                    </Button>
                                </div>
                            )}
                        </Card>
                    );
                })}

                {(reports ?? []).length === 0 && (
                    <EmptyState icon={ShieldAlert} title="Nothing reported" description="No posts have been flagged." />
                )}
            </div>
        </div>
    );
}
