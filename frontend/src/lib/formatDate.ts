/**
 * The one place dates are formatted for display, so every table, badge, card and thread reads the
 * same way: "24 Sep 2026", "1 Sep – 31 Oct 2026", "24 Sep 2026, 1:05 am".
 *
 * Not for native <input type="date"> / "datetime-local" values — the browser owns their display.
 */

type DateInput = string | number | Date;

const DAY_MONTH_YEAR = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hourCycle: 'h12' });

/**
 * A bare "2026-09-01" is parsed by `new Date()` as UTC midnight, which shows as 31 Aug anywhere
 * west of UTC. Treat date-only strings as local calendar dates instead.
 */
function toDate(value: DateInput): Date {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    return value instanceof Date ? value : new Date(value);
}

function parts(date: Date): { day: string; month: string; year: string } {
    const out = { day: '', month: '', year: '' };
    for (const part of DAY_MONTH_YEAR.formatToParts(date)) {
        if (part.type === 'day' || part.type === 'month' || part.type === 'year') out[part.type] = part.value;
    }
    // Newer ICU data abbreviates September as "Sept" in en-GB; keep every month at three letters.
    out.month = out.month.slice(0, 3);
    return out;
}

function isValid(date: Date): boolean {
    return !Number.isNaN(date.getTime());
}

/** "24 Sep 2026" */
export function formatDate(value: DateInput): string {
    const date = toDate(value);
    if (!isValid(date)) return '';
    const { day, month, year } = parts(date);
    return `${day} ${month} ${year}`;
}

/** "1 Sep – 31 Oct 2026"; the year is repeated only when the range crosses one ("15 Dec 2026 – 10 Jan 2027"). */
export function formatDateRange(start: DateInput, end: DateInput): string {
    const from = toDate(start);
    const to = toDate(end);
    if (!isValid(from) || !isValid(to)) return '';
    const a = parts(from);
    const b = parts(to);
    const left = a.year === b.year ? `${a.day} ${a.month}` : `${a.day} ${a.month} ${a.year}`;
    return `${left} – ${b.day} ${b.month} ${b.year}`;
}

/** "24 Sep 2026, 1:05 am" (no seconds) */
export function formatDateTime(value: DateInput): string {
    const date = toDate(value);
    if (!isValid(date)) return '';
    // Some ICU versions put a narrow no-break space before am/pm; use a normal space.
    const time = TIME.format(date).replace(/\s/g, ' ');
    return `${formatDate(date)}, ${time}`;
}
