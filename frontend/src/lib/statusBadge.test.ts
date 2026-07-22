import { describe, expect, it } from 'vitest';
import { courseStatusDisplay, enrolmentStatusDisplay, orderStatusDisplay } from '@/lib/statusBadge';

describe('statusBadge', () => {
    it('labels course statuses to match the schema.sql enum values verbatim', () => {
        expect(courseStatusDisplay('published').label).toBe('Published');
        expect(courseStatusDisplay('draft').label).toBe('Draft');
        expect(courseStatusDisplay('archived').label).toBe('Archived');
    });

    it('maps enrolment status to a success tone only when confirmed', () => {
        expect(enrolmentStatusDisplay('confirmed').tone).toBe('success');
        expect(enrolmentStatusDisplay('withdrawn').tone).toBe('neutral');
    });

    it('maps order status to a warning tone while pending', () => {
        expect(orderStatusDisplay('pending').tone).toBe('warning');
        expect(orderStatusDisplay('paid').tone).toBe('success');
    });
});
