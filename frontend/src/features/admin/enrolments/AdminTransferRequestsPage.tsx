import { useState } from 'react';
import { ArrowRight, CreditCard, ReceiptText, Users, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { useCourses } from '@/features/catalogue/useCourses';
import { useTransferRequests, useTransferEnrolment, useRefundEnrolment } from '@/features/admin/enrolments/useAdminEnrolments';
import { enrolmentStatusDisplay, orderStatusDisplay } from '@/lib/statusBadge';
import { usePageHeader } from '@/lib/pageHeader/PageHeaderContext';
import type { AdminEnrolment } from '@/lib/api/types';

function formatAmount(amount: string | number, currency: string): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount));
}

function TransferModal({ enrolment, courses, onClose }: { enrolment: AdminEnrolment; courses: any[]; onClose: () => void }) {
    const transferEnrolment = useTransferEnrolment();
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [note, setNote] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const selectedCourse = courses.find((c) => c.id === Number(selectedCourseId));

    const handleSubmit = async () => {
        setError(null);
        if (!selectedCourseId) {
            setError('Please select a target course.');
            return;
        }
        if (selectedCourse?.sections_required) {
            setError('This course requires section selection. Please use the main enrolments page to transfer to this course.');
            return;
        }

        try {
            await transferEnrolment.mutateAsync({
                enrolmentId: enrolment.id,
                payload: {
                    course_id: Number(selectedCourseId),
                    note: note || undefined,
                },
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not complete transfer.');
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={`Transfer ${enrolment.student.name} to another course`}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} isLoading={transferEnrolment.isPending}>
                        Transfer
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                {error && <Alert variant="error" message={error} />}
                
                <div className="text-sm text-ink-600">
                    <p><strong>Current course:</strong> {enrolment.course.title}</p>
                    {enrolment.section && <p><strong>Current section:</strong> {enrolment.section.name}</p>}
                </div>

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink-900">Target course</span>
                    <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="rounded-md border border-surface-100 bg-surface-0 px-3 py-2 text-sm text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                        <option value="">Select a course</option>
                        {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                                {course.title}
                            </option>
                        ))}
                    </select>
                </label>

                {selectedCourse?.sections_required && (
                    <Alert variant="error" message="This course requires section selection. Please use the main enrolments page to transfer to this course." />
                )}

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink-900">Note (optional)</span>
                    <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a note for the student..."
                        className="rounded-md border border-surface-100 bg-surface-0 px-3 py-2 text-sm text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    />
                </label>
            </div>
        </Modal>
    );
}

function RefundModal({ enrolment, onClose }: { enrolment: AdminEnrolment; onClose: () => void }) {
    const refundEnrolment = useRefundEnrolment();
    const [refundAmount, setRefundAmount] = useState<string>('');
    const [note, setNote] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Get amount paid from the enrolment's order if available
    const amountPaid = enrolment.order?.amount_paid || '0';

    const handleSubmit = async () => {
        setError(null);
        const numericAmount = Number(refundAmount);
        if (!numericAmount || numericAmount <= 0) {
            setError('Enter a refund amount greater than 0.');
            return;
        }
        if (numericAmount > Number(amountPaid)) {
            setError('Refund amount cannot exceed amount paid.');
            return;
        }

        try {
            await refundEnrolment.mutateAsync({
                enrolmentId: enrolment.id,
                payload: {
                    refund_amount: numericAmount,
                    note: note || undefined,
                },
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not process refund.');
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={`Process refund for ${enrolment.student.name}`}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} isLoading={refundEnrolment.isPending}>
                        Process refund
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                {error && <Alert variant="error" message={error} />}
                
                <div className="text-sm text-ink-600">
                    <p><strong>Course:</strong> {enrolment.course.title}</p>
                    <p><strong>Amount paid:</strong> {formatAmount(amountPaid, enrolment.order?.currency || 'USD')}</p>
                </div>

                <Input
                    label="Refund amount"
                    type="number"
                    min="0"
                    step="0.01"
                    max={Number(amountPaid)}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder={amountPaid}
                />

                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink-900">Note (optional)</span>
                    <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a note for the student..."
                        className="rounded-md border border-surface-100 bg-surface-0 px-3 py-2 text-sm text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    />
                </label>
            </div>
        </Modal>
    );
}

export function AdminTransferRequestsPage() {
    usePageHeader('Transfer Requests', 'Manage student transfer requests after payment.');
    
    const { data, isLoading } = useTransferRequests();
    const { data: courses } = useCourses({});
    
    const [transferringEnrolment, setTransferringEnrolment] = useState<AdminEnrolment | null>(null);
    const [refundingEnrolment, setRefundingEnrolment] = useState<AdminEnrolment | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const enrolments = data ?? [];

    const handleTransferSuccess = (studentName: string) => {
        setSuccessMessage(`Successfully transferred ${studentName} to another course.`);
    };

    const handleRefundSuccess = (studentName: string) => {
        setSuccessMessage(`Successfully processed refund for ${studentName}.`);
    };

    return (
        <div className="space-y-4">
            {/* Page header */}
            <div>
                <h1 className="text-lg font-semibold text-ink-900">Transfer Requests</h1>
                <p className="text-xs text-ink-400">
                    Manage student transfer requests after payment.
                </p>
            </div>

            {successMessage && (
                <Alert variant="success" message={successMessage} onDismiss={() => setSuccessMessage(null)} />
            )}

            {isLoading && <Spinner className="mt-6" />}

            {!isLoading && enrolments.length === 0 && (
                <EmptyState icon={Users} title="No transfer requests" description="No pending transfer requests to review." className="mt-6" />
            )}

            {!isLoading && enrolments.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm">
                    {/* Column headers */}
                    <div className="grid grid-cols-[minmax(180px,1.2fr)_minmax(160px,1.2fr)_minmax(120px,1fr)_120px_140px_140px_120px] items-center gap-2 border-b border-surface-100 bg-surface-50 px-4 py-2.5">
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Student</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Current course</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Amount paid</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Order status</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Requested at</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600">Note</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink-600 text-right">Actions</span>
                    </div>

                    {/* Rows */}
                    <ul className="divide-y divide-surface-100">
                        {enrolments.map((enrolment) => {
                            const status = enrolmentStatusDisplay(enrolment.status);
                            const orderStatus = enrolment.order ? orderStatusDisplay(enrolment.order.status) : null;
                            const transferRequestedAt = enrolment.transfer_requested_at 
                                ? new Date(enrolment.transfer_requested_at).toLocaleDateString()
                                : '—';

                            return (
                                <li
                                    key={enrolment.id}
                                    className="grid grid-cols-[minmax(180px,1.2fr)_minmax(160px,1.2fr)_minmax(120px,1fr)_120px_140px_140px_120px] items-center gap-2 px-4 py-3 transition-colors hover:bg-surface-50"
                                >
                                    {/* Student */}
                                    <div className="flex min-w-0 items-center gap-2">
                                        <Avatar name={enrolment.student.name} size="sm" className="size-7 shrink-0 text-xs" />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-ink-900">{enrolment.student.name}</p>
                                            <p className="truncate text-xs text-ink-400">{enrolment.student.email}</p>
                                        </div>
                                    </div>

                                    {/* Course & section */}
                                    <div className="min-w-0">
                                        <p className="truncate text-sm text-ink-900">{enrolment.course.title}</p>
                                        <p className="truncate text-xs text-ink-400">{enrolment.section?.name ?? 'Self-paced'}</p>
                                    </div>

                                    {/* Amount paid */}
                                    <p className="font-mono text-sm text-ink-600">
                                        {enrolment.order ? formatAmount(enrolment.order.amount_paid, enrolment.order.currency) : '—'}
                                    </p>

                                    {/* Order status */}
                                    {orderStatus && <Badge label={orderStatus.label} tone={orderStatus.tone} icon={orderStatus.icon} />}

                                    {/* Transfer requested at */}
                                    <p className="text-sm text-ink-400">{transferRequestedAt}</p>

                                    {/* Withdrawal note */}
                                    <p className="truncate text-sm text-ink-600" title={enrolment.withdrawal_note || ''}>
                                        {enrolment.withdrawal_note || '—'}
                                    </p>

                                    {/* Actions */}
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            onClick={() => setTransferringEnrolment(enrolment)}
                                            aria-label={`Transfer ${enrolment.student.name} to another course`}
                                            className="flex items-center justify-center rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-blue-600/10 hover:text-blue-600"
                                            title="Transfer to another course"
                                        >
                                            <ArrowRight className="size-4" aria-hidden="true" />
                                        </button>
                                        <button
                                            onClick={() => setRefundingEnrolment(enrolment)}
                                            aria-label={`Process refund for ${enrolment.student.name}`}
                                            className="flex items-center justify-center rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-danger-600/10 hover:text-danger-600"
                                            title="Process refund"
                                        >
                                            <ReceiptText className="size-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {transferringEnrolment && (
                <TransferModal
                    enrolment={transferringEnrolment}
                    courses={courses?.data ?? []}
                    onClose={() => {
                        setTransferringEnrolment(null);
                        if (successMessage) handleTransferSuccess(transferringEnrolment.student.name);
                    }}
                />
            )}

            {refundingEnrolment && (
                <RefundModal
                    enrolment={refundingEnrolment}
                    onClose={() => {
                        setRefundingEnrolment(null);
                        if (successMessage) handleRefundSuccess(refundingEnrolment.student.name);
                    }}
                />
            )}
        </div>
    );
}