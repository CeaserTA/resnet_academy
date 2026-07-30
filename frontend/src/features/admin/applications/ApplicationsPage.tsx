import { useState } from 'react';
import { Check, Eye, Info, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { useCourses } from '@/features/catalogue/useCourses';
import {
    useApproveCourseApplication,
    useCourseApplications,
    useRejectCourseApplication,
} from '@/features/courseApplications/useCourseApplications';
import { courseApplicationStatusDisplay } from '@/lib/statusBadge';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import type { CourseApplication, CourseApplicationStatus } from '@/lib/api/types';

type Tab = 'all' | 'rejected' | 'approved';

const STATUS_ORDER: Record<CourseApplicationStatus, number> = { pending: 0, approved: 1, rejected: 2 };

function ViewApplicationModal({ application, onClose }: { application: CourseApplication; onClose: () => void }) {
    const status = courseApplicationStatusDisplay(application.status);

    return (
        <Modal isOpen onClose={onClose} title={application.student.name}>
            <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-ink-600">Status</span>
                    <Badge label={status.label} tone={status.tone} icon={status.icon} />
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-ink-600">Email</span>
                    <span className="text-ink-900">{application.student.email}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-ink-600">Course</span>
                    <span className="text-ink-900">{application.course.title}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-ink-600">Applied</span>
                    <span className="text-ink-900">{new Date(application.applied_at).toLocaleString()}</span>
                </div>

                {(application.course.application_questions ?? []).map((question, index) => (
                    <div key={index} className="border-t border-surface-100 pt-3">
                        <p className="font-medium text-ink-900">{question}</p>
                        <p className="mt-1 text-ink-600">{application.answers?.[index] || '—'}</p>
                    </div>
                ))}

                {application.portfolio_url && (
                    <div className="border-t border-surface-100 pt-3">
                        <p className="font-medium text-ink-900">Portfolio / link</p>
                        <a href={application.portfolio_url} target="_blank" rel="noreferrer" className="mt-1 block text-blue-600 hover:underline">
                            {application.portfolio_url}
                        </a>
                    </div>
                )}

                {application.alternative_proof_text && (
                    <div className="border-t border-surface-100 pt-3">
                        <p className="font-medium text-ink-900">Alternative proof of skill</p>
                        <p className="mt-1 text-ink-600">{application.alternative_proof_text}</p>
                    </div>
                )}
            </div>
        </Modal>
    );
}

function RejectApplicationModal({ application, onClose }: { application: CourseApplication; onClose: () => void }) {
    const { data: beginnerCourses } = useCourses({ level: 'beginner' });
    const rejectApplication = useRejectCourseApplication();
    const [recommendedIds, setRecommendedIds] = useState<number[]>([]);

    const toggleCourse = (id: number) => {
        setRecommendedIds((current) => (current.includes(id) ? current.filter((c) => c !== id) : [...current, id]));
    };

    const handleConfirm = async () => {
        await rejectApplication.mutateAsync({ id: application.id, recommendedCourseIds: recommendedIds });
        onClose();
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={`Reject ${application.student.name}'s application`}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleConfirm} isLoading={rejectApplication.isPending}>
                        Confirm reject
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-3 text-sm">
                <p className="text-ink-600">
                    Optionally recommend beginner courses to point this student toward instead.
                </p>
                <div className="flex flex-col gap-2">
                    {beginnerCourses?.data.map((course) => (
                        <label key={course.id} className="flex items-center gap-2 text-ink-900">
                            <input
                                type="checkbox"
                                checked={recommendedIds.includes(course.id)}
                                onChange={() => toggleCourse(course.id)}
                            />
                            {course.title}
                        </label>
                    ))}
                    {beginnerCourses?.data.length === 0 && <p className="text-ink-600">No beginner courses yet.</p>}
                </div>
            </div>
        </Modal>
    );
}

export function ApplicationsPage() {
    usePageHeader('Applications', 'Course applications, pending first.');
    const { data, isLoading } = useCourseApplications();
    const approveApplication = useApproveCourseApplication();

    const [tab, setTab] = useState<Tab>('all');
    const [viewingApplication, setViewingApplication] = useState<CourseApplication | null>(null);
    const [rejectingApplication, setRejectingApplication] = useState<CourseApplication | null>(null);

    const applications = [...(data ?? [])]
        .filter((application) => tab === 'all' || application.status === tab)
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

    return (
        <div>
            <div className="flex gap-1 border-b border-surface-100">
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
                                const status = courseApplicationStatusDisplay(application.status);

                                return (
                                    <tr key={application.id} className={index % 2 === 1 ? 'bg-surface-50' : undefined}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-ink-900">{application.student.name}</p>
                                            <p className="text-xs text-ink-600">{application.student.email}</p>
                                        </td>
                                        <td className="px-4 py-3 text-ink-600">{application.course.title}</td>
                                        <td className="px-4 py-3">
                                            <Badge label={status.label} tone={status.tone} icon={status.icon} />
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-xs text-ink-600">
                                            {new Date(application.applied_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                {application.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            className="px-2 py-1"
                                                            onClick={() => approveApplication.mutate(application.id)}
                                                            isLoading={
                                                                approveApplication.isPending &&
                                                                approveApplication.variables === application.id
                                                            }
                                                            aria-label={`Approve ${application.student.name}`}
                                                        >
                                                            <Check className="size-4 text-success-600" aria-hidden="true" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            className="px-2 py-1"
                                                            onClick={() => setRejectingApplication(application)}
                                                            aria-label={`Reject ${application.student.name}`}
                                                        >
                                                            <X className="size-4 text-danger-600" aria-hidden="true" />
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    className="px-2 py-1"
                                                    onClick={() => setViewingApplication(application)}
                                                    aria-label={`View ${application.student.name}`}
                                                >
                                                    <Eye className="size-4" aria-hidden="true" />
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
            {rejectingApplication && (
                <RejectApplicationModal application={rejectingApplication} onClose={() => setRejectingApplication(null)} />
            )}
        </div>
    );
}
