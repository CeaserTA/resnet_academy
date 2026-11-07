import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/lib/api/client';
import { useSubmitPayment } from '@/features/enrolment/useEnrolments';
import { formatMoney } from '@/lib/finance';
import type { Enrolment } from '@/lib/api/types';

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

/**
 * The student's "Make a payment" window — pick the course (skipped when there's only one),
 * enter the amount and attach the receipt. Shared by My courses and the Dashboard.
 */
export function MakePaymentModal({ enrolments, onClose, onSubmitted }: { enrolments: Enrolment[]; onClose: () => void; onSubmitted: () => void }) {
    const submitPayment = useSubmitPayment();
    const [selected, setSelected] = useState<Enrolment | null>(() => (enrolments.length === 1 ? enrolments[0] : null));
    const [amount, setAmount] = useState(() =>
        enrolments.length === 1 ? enrolments[0].order!.remaining_balance.toString() : '',
    );
    const [receipt, setReceipt] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSelect = (enrolment: Enrolment) => {
        setSelected(enrolment);
        setAmount(enrolment.order!.remaining_balance.toString());
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > MAX_RECEIPT_BYTES) { setError('That file is over 5MB. Choose a smaller one.'); return; }
        setError(null);
        setReceipt(file);
    };

    const handleSubmit = async () => {
        if (!selected?.order) return;
        setError(null);
        const numericAmount = Number(amount);
        if (!numericAmount || numericAmount <= 0) { setError('Enter an amount greater than zero.'); return; }
        if (numericAmount > selected.order.remaining_balance) { setError("You can't pay more than the remaining balance for this course."); return; }
        if (!receipt) { setError('Attach a receipt image.'); return; }
        try {
            await submitPayment.mutateAsync({ orderId: selected.order.id, amount: numericAmount, receipt });
            onSubmitted();
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not submit the payment. Try again.');
        }
    };

    if (!selected) {
        return (
            <Modal isOpen onClose={onClose} title="Make a payment">
                <div className="flex flex-col gap-2">
                    <p className="text-sm text-ink-600">Choose which course you&apos;re paying for.</p>
                    {enrolments.map((enrolment) => (
                        <button
                            key={enrolment.id}
                            type="button"
                            onClick={() => handleSelect(enrolment)}
                            className="flex items-center justify-between rounded-md border border-surface-100 px-3 py-2.5 text-left text-sm hover:bg-surface-50"
                        >
                            <span className="font-medium text-ink-900">{enrolment.course.title}</span>
                            <span className="text-ink-600">
                                {formatMoney(enrolment.order!.remaining_balance, enrolment.order!.currency)}
                            </span>
                        </button>
                    ))}
                </div>
            </Modal>
        );
    }

    const order = selected.order!;
    return (
        <Modal
            isOpen
            onClose={onClose}
            title={`Pay for ${selected.course.title}`}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} isLoading={submitPayment.isPending}>Submit</Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                {enrolments.length > 1 && (
                    <button type="button" onClick={() => setSelected(null)} className="self-start text-sm text-blue-600 hover:underline">
                        ← Choose a different course
                    </button>
                )}
                {error && <Alert variant="error" message={error} />}
                <p className="text-sm text-ink-600">
                    Remaining balance: <span className="font-medium text-ink-900">{formatMoney(order.remaining_balance, order.currency)}</span>
                </p>
                <Input label={`Amount to pay (${order.currency})`} type="number" min={0} max={order.remaining_balance} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink-900">Receipt image</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="text-sm text-ink-600" />
                    {receipt && <span className="text-xs text-ink-600">{receipt.name}</span>}
                </label>
            </div>
        </Modal>
    );
}
