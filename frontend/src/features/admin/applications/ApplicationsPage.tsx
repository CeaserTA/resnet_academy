import { useState } from 'react';
import { Check, Eye, Info, Pencil, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import {
    useApplications,
    useDeleteApplication,
    useSetApplicationStatus,
    useUpdateApplication,
} from '@/features/admin/applications/useApplications';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import type { Application, ApplicationStatus } from '@/features/admin/applications/mockApplications';

type Tab = 'all' | 'rejected' | 'approved';

const STATUS_ORDER: Record<ApplicationStatus, number> = { pending: 0, approved: 1, rejected: 2 };
const STATUS_DISPLAY: Record<ApplicationStatus, { label: string; tone: 'warning' | 'success' | 'danger' }> = {
    pending: { label: 'Pending', tone: 'warning' },
    approved: { label: 'Approved', tone: 'success' },
    rejected: { label: 'Rejected', tone: 'danger' },
};

function ViewApplicationModal({ application, onClose }: { application: Application; onClose: () => void }) {
    const status = STATUS_DISPLAY[application.status];

    return (
        <Modal isOpen onClose={onClose} title={application.studentName}>
            <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-ink-600">Status</span>
                    <Badge label={status.label} tone={status.tone} />
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-ink-600">Email</span>
                    <span className="text-ink-900">{application.studentEmail}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-ink-600">Course</span>
                    <span className="text-ink-900">{application.courseTitle}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-ink-600">Applied</span>
                    <span className="text-ink-900">{new Date(application.appliedAt).toLocaleString()}</span>
                </div>
            </div>
        </Modal>
    );
}

function EditApplicationModal({ application, onClose }: { application: Application; onClose: () => void }) {
    const updateApplication = useUpdateApplication();
    const [studentName, setStudentName] = useState(application.studentName);
    const [studentEmail, setStudentEmail] = useState(application.studentEmail);
    const [courseTitle, setCourseTitle] = useState(application.courseTitle);

    const handleSave = async () => {
        await updateApplication.mutateAsync({ id: application.id, studentName, studentEmail, courseTitle });
        onClose();
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={`Edit application`}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} isLoading={updateApplication.isPending}>
                        Save changes
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                <Input label="Student name" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                <Input label="Student email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} />
                <Input label="Course" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} />
            </div>
        </Modal>
    );
}

export function ApplicationsPage() {
    usePageHeader('Applications', 'Course applications, pending first.');
    const { data, isLoading } = useApplications();
    const setStatus = useSetApplicationStatus();
    const deleteApplication = useDeleteApplication();

    const [tab, setTab] = useState<Tab>('all');
    const [viewingApplication, setViewingApplication] = useState<Application | null>(null);
    const [editingApplication, setEditingApplication] = useState<Application | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const applications = [...(data ?? [])]
        .filter((application) => tab === 'all' || application.status === tab)
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

    const handleDelete = async (id: number) => {
        if (deletingId !== id) {
            setDeletingId(id);
            return;
        }

        await deleteApplication.mutateAsync(id);
        setDeletingId(null);
    };

    return (
        <div>
            <div className="flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-600">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>
                    Preview — enrolments in Resnet LMS confirm automatically today, so this isn&apos;t connected to a
                    live approval workflow yet. This is what one would look like.
                </p>
            </div>

            <div className="mt-4 flex gap-1 border-b border-surface-100">
                {(
                    [
                        ['all', 'All'],
                        ['rejected', 'Rejected'],
                        ['approved', 'Approved'],
                    ] as const
                ).map(([value, label]) => (
                    <button
                        key={value}
                        onClick={() => setTab(value)}
                        className={cn(
                            'border-b-2 px-3 py-2 text-sm font-medium',
                            tab === value ? 'border-blue-600 text-blue-600' : 'border-transparent text-ink-600',
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {isLoading && <Spinner className="mt-6" />}

            {!isLoading && applications.length === 0 && (
                <EmptyState icon={Info} title="No applications" description="Nothing matches this tab." className="mt-6" />
            )}

            {!isLoading && applications.length > 0 && (
                <div className="mt-6 overflow-x-auto rounded-lg border border-surface-100 bg-surface-0">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-surface-100 text-left">
                            <tr>
                                <th className="px-4 py-2 font-medium text-ink-600">Student</th>
                                <th className="px-4 py-2 font-medium text-ink-600">Course</th>
                                <th className="px-4 py-2 font-medium text-ink-600">Status</th>
                                <th className="px-4 py-2 text-right font-medium text-ink-600">Applied</th>
                                <th className="px-4 py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {applications.map((application, index) => {
                                const status = STATUS_DISPLAY[application.status];
                                const isConfirmingDelete = deletingId === application.id;

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
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                {application.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            className="px-2 py-1"
                                                            onClick={() => setStatus.mutate({ id: application.id, status: 'approved' })}
                                                            aria-label={`Approve ${application.studentName}`}
                                                        >
                                                            <Check className="size-4 text-success-600" aria-hidden="true" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            className="px-2 py-1"
                                                            onClick={() => setStatus.mutate({ id: application.id, status: 'rejected' })}
                                                            aria-label={`Reject ${application.studentName}`}
                                                        >
                                                            <X className="size-4 text-danger-600" aria-hidden="true" />
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    className="px-2 py-1"
                                                    onClick={() => setViewingApplication(application)}
                                                    aria-label={`View ${application.studentName}`}
                                                >
                                                    <Eye className="size-4" aria-hidden="true" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    className="px-2 py-1"
                                                    onClick={() => setEditingApplication(application)}
                                                    aria-label={`Edit ${application.studentName}`}
                                                >
                                                    <Pencil className="size-4" aria-hidden="true" />
                                                </Button>
                                                <Button
                                                    variant={isConfirmingDelete ? 'destructive' : 'ghost'}
                                                    className="px-2 py-1"
                                                    onClick={() => handleDelete(application.id)}
                                                    aria-label={
                                                        isConfirmingDelete
                                                            ? `Confirm delete ${application.studentName}`
                                                            : `Delete ${application.studentName}`
                                                    }
                                                >
                                                    <Trash2 className="size-4" aria-hidden="true" />
                                                    {isConfirmingDelete && 'Confirm'}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {viewingApplication && (
                <ViewApplicationModal application={viewingApplication} onClose={() => setViewingApplication(null)} />
            )}
            {editingApplication && (
                <EditApplicationModal application={editingApplication} onClose={() => setEditingApplication(null)} />
            )}
        </div>
    );
}
