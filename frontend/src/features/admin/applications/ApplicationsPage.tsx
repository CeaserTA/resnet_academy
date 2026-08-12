import { useState } from 'react';
import { Check, Eye, Info, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import { useCourses } from '@/features/catalogue/useCourses';
import {
    useApproveCourseApplication,
    useCourseApplications,
    useRejectCourseApplication,
} from '@/features/courseApplications/useCourseApplications';
import { courseApplicationStatusDisplay } from '@/lib/statusBadge';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import { useAuth } from '@/lib/auth/AuthContext';
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
                {application.reviewer && (
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-ink-600">Reviewed by</span>
                        <span className="text-ink-900">
                            {application.reviewer.name} ({application.reviewer.role})
                        </span>
                    </div>
                )}

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
    const [rejectionReason, setRejectionReason] = useState('');

    const toggleCourse = (id: number) => {
        setRecommendedIds((current) => (current.includes(id) ? current.filter((c) => c !== id) : [...current, id]));
    };

    const handleConfirm = async () => {
        await rejectApplication.mutateAsync({
            id: application.id,
            recommendedCourseIds: recommendedIds,
            rejectionReason: rejectionReason.trim() || undefined,
        });
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
                <Textarea
                    label="Reason (shown to the student)"
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. This course requires prior experience in web fundamentals."
                />

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
    const { user } = useAuth();
    usePageHeader(
        'Applications',
        user?.role === 'instructor' ? 'Applications for your courses, pending first.' : 'Course applications, pending first.',
    );
    const { data, isLoading } = useCourseApplications();
    const approveApplication = useApproveCourseApplication();

    const [tab, setTab] = useState<Tab>('all');
    const [viewingApplication, setViewingApplication] = useState<CourseApplication | null>(null);
    const [rejectingApplication, setRejectingApplication] = useState<CourseApplication | null>(null);

    const applications = [...(data ?? [])]
        .filter((application) => tab === 'all' || application.status === tab)
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

    return (
        <div className="space-y-4">
            {/* Page header */}
            <div>
                <h1 className="text-lg font-semibold text-ink-900">Applications</h1>
                <p className="text-xs text-ink-400">
                    {user?.role === 'instructor' ? 'Applications for your courses, pending first.' : 'Course applications, pending first.'}
                </p>
            </div>

            {/* Segmented tab bar */}
            <div className="flex items-center gap-0.5 rounded-lg border border-surface-100 bg-surface-50 p-0.5 self-start">
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
                            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                            tab === value ? 'bg-blue-600 text-white shadow-sm' : 'text-ink-600 hover:text-ink-900',
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
                <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                    {/* Column headers */}
                    <div className="grid grid-cols-[minmax(180px,1fr)_minmax(140px,1fr)_120px_110px_80px] items-center gap-2 border-b border-surface-100 bg-surface-50 px-4 py-2.5">
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Student</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Course</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Status</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600 text-right">Applied</span>
                        <span />
                    </div>

                    {/* Rows */}
                    <ul className="divide-y divide-surface-100">
                        {applications.map((application) => {
                            const status = courseApplicationStatusDisplay(application.status);

                            return (
                                <li
                                    key={application.id}
                                    className="grid grid-cols-[minmax(180px,1fr)_minmax(140px,1fr)_120px_110px_80px] items-center gap-2 px-4 py-3 transition-colors hover:bg-surface-50"
                                >
                                    {/* Student */}
                                    <div className="flex min-w-0 items-center gap-2">
                                        <Avatar
                                            name={application.student.name}
                                            size="sm"
                                            className="size-7 shrink-0 text-xs"
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-ink-900">{application.student.name}</p>
                                            <p className="truncate text-xs text-ink-400">{application.student.email}</p>
                                        </div>
                                    </div>

                                    {/* Course */}
                                    <p className="truncate text-sm text-ink-600">{application.course.title}</p>

                                    {/* Status */}
                                    <Badge label={status.label} tone={status.tone} icon={status.icon} />

                                    {/* Applied */}
                                    <p className="text-right font-mono text-xs text-ink-400">
                                        {new Date(application.applied_at).toLocaleDateString()}
                                    </p>

                                    {/* Actions */}
                                    <div className="flex items-center justify-end gap-1">
                                        {application.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => approveApplication.mutate(application.id)}
                                                    aria-label={`Approve ${application.student.name}`}
                                                    className="flex items-center justify-center rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-900"
                                                >
                                                    <Check className="size-4 text-success-600" aria-hidden="true" />
                                                </button>
                                                <button
                                                    onClick={() => setRejectingApplication(application)}
                                                    aria-label={`Reject ${application.student.name}`}
                                                    className="flex items-center justify-center rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-danger-600/10 hover:text-danger-600"
                                                >
                                                    <X className="size-4" aria-hidden="true" />
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => setViewingApplication(application)}
                                            aria-label={`View ${application.student.name}`}
                                            className="flex items-center justify-center rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-surface-100 hover:text-ink-900"
                                        >
                                            <Eye className="size-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
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
