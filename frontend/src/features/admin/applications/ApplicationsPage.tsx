import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useApplications } from '@/features/admin/applications/useApplications';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import type { ApplicationStatus } from '@/features/admin/applications/mockApplications';

const STATUS_ORDER: Record<ApplicationStatus, number> = { pending: 0, approved: 1 };
const STATUS_DISPLAY: Record<ApplicationStatus, { label: string; tone: 'warning' | 'success' }> = {
    pending: { label: 'Pending', tone: 'warning' },
    approved: { label: 'Approved', tone: 'success' },
};

export function ApplicationsPage() {
    usePageHeader('Applications', 'Course applications, pending first.');
    const { data, isLoading } = useApplications();

    const applications = [...(data ?? [])].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

    return (
        <div>
            <div className="flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-600">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>
                    Preview — enrolments in Resnet LMS confirm automatically today, so this isn&apos;t connected to a
                    live approval workflow yet. This is what one would look like.
                </p>
            </div>

            {isLoading && <Spinner className="mt-6" />}

            {!isLoading && (
                <div className="mt-6 overflow-x-auto rounded-lg border border-surface-100 bg-surface-0">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-surface-100 text-left">
                            <tr>
                                <th className="px-4 py-2 font-medium text-ink-600">Student</th>
                                <th className="px-4 py-2 font-medium text-ink-600">Course</th>
                                <th className="px-4 py-2 font-medium text-ink-600">Status</th>
                                <th className="px-4 py-2 text-right font-medium text-ink-600">Applied</th>
                            </tr>
                        </thead>
                        <tbody>
                            {applications.map((application, index) => {
                                const status = STATUS_DISPLAY[application.status];

                                return (
                                    <tr key={application.id} className={index % 2 === 1 ? 'bg-surface-50' : undefined}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-ink-900">{application.studentName}</p>
                                            <p className="text-xs text-ink-600">{application.studentEmail}</p>
                                        </td>
                                        <td className="px-4 py-3 text-ink-600">{application.courseTitle}</td>
                                        <td className="px-4 py-3">
                                            <Badge label={status.label} tone={status.tone} />
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-xs text-ink-600">
                                            {new Date(application.appliedAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
