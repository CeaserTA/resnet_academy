import { useState } from 'react';
import { Link } from 'react-router';
import { Award, BookOpen, Compass, LogOut } from 'lucide-react';
import { useMyEnrolments, useWithdrawEnrolment } from '@/features/enrolment/useEnrolments';
import { useProgressDashboard } from '@/features/progress/useProgress';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { courseProgressStatusDisplay, enrolmentStatusDisplay, orderStatusDisplay } from '@/lib/statusBadge';

export function MyCoursesPage() {
    const { data, isLoading } = useMyEnrolments();
    const { data: progressRows } = useProgressDashboard();
    const withdrawEnrolment = useWithdrawEnrolment();
    const [confirmingWithdrawId, setConfirmingWithdrawId] = useState<number | null>(null);

    const handleWithdraw = (enrolmentId: number) => {
        if (confirmingWithdrawId !== enrolmentId) {
            setConfirmingWithdrawId(enrolmentId);
            return;
        }

        withdrawEnrolment.mutate(enrolmentId);
        setConfirmingWithdrawId(null);
    };

    if (isLoading) {
        return <Spinner />;
    }

    const enrolments = data?.data ?? [];
    const progressByCourseId = new Map((progressRows ?? []).map((row) => [row.course.id, row]));

    return (
        <div>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl">My courses</h1>
                <Link to="/courses">
                    <Button variant="secondary">
                        <Compass className="size-4" aria-hidden="true" />
                        Browse catalogue
                    </Button>
                </Link>
            </div>

            {enrolments.length === 0 ? (
                <EmptyState
                    icon={BookOpen}
                    title="You haven’t enrolled in any courses yet"
                    description="Browse the catalogue to find your first course."
                    action={
                        <Link to="/courses">
                            <Button>Browse the catalogue</Button>
                        </Link>
                    }
                    className="mt-6"
                />
            ) : (
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {enrolments.map((enrolment) => {
                        const status = enrolmentStatusDisplay(enrolment.status);
                        const orderStatus = enrolment.order ? orderStatusDisplay(enrolment.order.status) : null;
                        const progress = progressByCourseId.get(enrolment.course.id);
                        const progressStatus = progress ? courseProgressStatusDisplay(progress.status) : null;

                        return (
                            <Card key={enrolment.id}>
                                <Link to={`/learn/courses/${enrolment.course.id}`}>
                                    <div className="flex items-center justify-between">
                                        <Badge label={status.label} tone={status.tone} icon={status.icon} />
                                        {orderStatus && (
                                            <Badge
                                                label={orderStatus.label}
                                                tone={orderStatus.tone}
                                                icon={orderStatus.icon}
                                            />
                                        )}
                                    </div>
                                    <h3 className="mt-3 text-lg">{enrolment.course.title}</h3>
                                    <p className="mt-1 text-sm text-ink-600">
                                        Enrolled {new Date(enrolment.applied_at).toLocaleDateString()}
                                    </p>
                                </Link>

                                {progress && (
                                    <div className="mt-4 flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <Badge
                                                label={progressStatus!.label}
                                                tone={progressStatus!.tone}
                                                icon={progressStatus!.icon}
                                            />
                                            <span className="font-mono text-xs text-ink-600">
                                                {progress.percent_complete}%
                                            </span>
                                        </div>
                                        <ProgressBar percent={progress.percent_complete} />

                                        {progress.certificate && (
                                            <a
                                                href={progress.certificate.certificate_url ?? undefined}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="mt-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                            >
                                                <Award className="size-4" aria-hidden="true" />
                                                {progress.certificate.certificate_url
                                                    ? 'Download certificate'
                                                    : 'Certificate generating…'}
                                            </a>
                                        )}
                                    </div>
                                )}

                                {enrolment.status === 'confirmed' && (
                                    <Button
                                        variant={confirmingWithdrawId === enrolment.id ? 'destructive' : 'ghost'}
                                        onClick={() => handleWithdraw(enrolment.id)}
                                        isLoading={withdrawEnrolment.isPending}
                                        className="mt-3 w-full justify-start px-2 py-1 text-sm"
                                    >
                                        <LogOut className="size-4" aria-hidden="true" />
                                        {confirmingWithdrawId === enrolment.id ? 'Confirm withdrawal?' : 'Withdraw'}
                                    </Button>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
