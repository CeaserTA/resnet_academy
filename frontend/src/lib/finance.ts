import type { Enrolment, Order } from '@/lib/api/types';

/** "UGX 450,000" — same formatter as the admin Payments page. */
export function formatMoney(amount: string | number, currency: string): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount));
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
