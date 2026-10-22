import type { Enrolment, Order, PaymentSubmission } from '@/lib/api/types';

/** "UGX 450,000" — same formatter as the admin Payments page. */
export function formatMoney(amount: string | number, currency: string): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount));
}

/** Enrolments the student can pay towards now: a balance is left and no payment is awaiting review. */
export function payableEnrolments(enrolments: Enrolment[]): Enrolment[] {
    return enrolments.filter((e) => e.order && e.order.remaining_balance > 0 && !e.order.pending_submission);
}

/** Orders that actually cost something (free courses create zero-value orders). */
export function paidCourseOrders(enrolments: Enrolment[]): Order[] {
    return enrolments.flatMap((e) => (e.order && Number(e.order.amount) > 0 ? [e.order] : []));
}

export interface FinanceTotals {
    currency: string;
    total: number;
    paid: number;
    outstanding: number;
    /** True when orders exist in more than one currency; totals then cover `currency` only. */
    hasOtherCurrencies: boolean;
}

/**
 * Totals across the student's orders, straight from the order data the enrolments endpoint
 * already returns (amount, amount_paid, remaining_balance) — nothing recomputed from payments.
 */
export function financeTotals(orders: Order[]): FinanceTotals | null {
    if (orders.length === 0) return null;
    const currencies = [...new Set(orders.map((o) => o.currency))];
    const currency = currencies[0];
    const same = orders.filter((o) => o.currency === currency);
    return {
        currency,
        total: same.reduce((sum, o) => sum + Number(o.amount), 0),
        paid: same.reduce((sum, o) => sum + Number(o.amount_paid), 0),
        outstanding: same.reduce((sum, o) => sum + Number(o.remaining_balance), 0),
        hasOtherCurrencies: currencies.length > 1,
    };
}

/**
 * The latest decided payment (confirmed or rejected) per course, newest first — what the
 * student should hear about: "accepted" or "not accepted, because…". A rejected payment that
 * has since been resubmitted is replaced by the newer submission's state.
 */
export function latestPaymentUpdates(enrolments: Enrolment[]): { courseTitle: string; submission: PaymentSubmission; currency: string }[] {
    return enrolments
        .flatMap((e) => {
            const latest = [...(e.order?.payment_submissions ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
            return latest && latest.status !== 'pending' && e.order
                ? [{ courseTitle: e.course.title, submission: latest, currency: e.order.currency }]
                : [];
        })
        .sort((a, b) => (b.submission.reviewed_at ?? b.submission.created_at).localeCompare(a.submission.reviewed_at ?? a.submission.created_at));
}
