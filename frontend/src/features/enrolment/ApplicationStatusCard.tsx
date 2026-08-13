import { Link } from 'react-router';
import { X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { courseApplicationStatusDisplay } from '@/lib/statusBadge';
import type { CourseApplication } from '@/lib/api/types';

export function ApplicationStatusCard({
    application,
    onDismiss,
}: {
    application: CourseApplication;
    onDismiss?: () => void;
}) {
    if (application.status === 'approved') {
        // Approved courses show up in the enrolled-courses grid instead — nothing to add here.
        return null;
    }

    const status = courseApplicationStatusDisplay(application.status);
    const isRejected = application.status === 'rejected';

    return (
        <Card className={isRejected ? 'relative' : 'relative border-dashed bg-surface-50'}>
            {isRejected && onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss"
                    className="absolute right-3 top-3 rounded-full p-1 text-ink-600 hover:bg-surface-100 hover:text-ink-900"
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            )}

            <div className="flex items-center justify-between">
                <Badge label={status.label} tone={status.tone} icon={status.icon} />
            </div>
            <h3 className="mt-3 text-lg">{application.course.title}</h3>
            <p className="mt-1 text-sm text-ink-600">
                Applied {new Date(application.applied_at).toLocaleDateString()}
                {application.section && (
                    <span className="ml-2 text-ink-400">
                        · Section: {application.section.name}
                    </span>
                )}
            </p>

            {isRejected && (
                <>
                    {application.rejection_reason && (
                        <p className="mt-3 border-t border-surface-100 pt-3 text-sm text-ink-600">
                            {application.rejection_reason}
                        </p>
                    )}

                    {application.recommended_courses.length > 0 && (
                        <div className="mt-3 flex flex-col gap-2 border-t border-surface-100 pt-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-600">
                                Recommended next step
                            </p>
                            {application.recommended_courses.map((recommended) => (
                                <Button key={recommended.id} asChild className="justify-center">
                                    <Link to={`/courses/${recommended.id}`}>Start {recommended.title} →</Link>
                                </Button>
                            ))}
                        </div>
                    )}

                    <p className="mt-3 text-center text-sm text-ink-600">
                        Questions about this decision?{' '}
                        <Link to="/tickets" className="text-blue-600 hover:underline">
                            Contact support
                        </Link>
                    </p>
                </>
            )}
        </Card>
    );
}
