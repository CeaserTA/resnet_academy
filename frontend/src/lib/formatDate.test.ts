import { describe, expect, it } from 'vitest';
import { formatDate, formatDateRange, formatDateTime } from '@/lib/formatDate';

describe('formatDate', () => {
    it('formats as day, three-letter month, year', () => {
        expect(formatDate(new Date(2026, 8, 24, 13, 5))).toBe('24 Sep 2026');
        expect(formatDate(new Date(2026, 5, 3))).toBe('3 Jun 2026');
    });

    it('treats a date-only string as a local calendar date', () => {
        expect(formatDate('2026-09-01')).toBe('1 Sep 2026');
    });

    it('returns an empty string for an invalid date', () => {
        expect(formatDate('not a date')).toBe('');
    });
});

describe('formatDateRange', () => {
    it('shows the year once when both ends share it', () => {
        expect(formatDateRange('2026-09-01', '2026-10-31')).toBe('1 Sep – 31 Oct 2026');
    });

    it('shows both years when the range crosses one', () => {
        expect(formatDateRange('2026-12-15', '2027-01-10')).toBe('15 Dec 2026 – 10 Jan 2027');
    });
});

describe('formatDateTime', () => {
    it('adds a 12-hour time without seconds', () => {
        expect(formatDateTime(new Date(2026, 8, 24, 1, 5, 42))).toBe('24 Sep 2026, 1:05 am');
        expect(formatDateTime(new Date(2026, 8, 24, 0, 5))).toBe('24 Sep 2026, 12:05 am');
        expect(formatDateTime(new Date(2026, 8, 24, 17, 40))).toBe('24 Sep 2026, 5:40 pm');
    });
});
