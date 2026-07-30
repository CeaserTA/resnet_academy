import { describe, expect, it } from 'vitest';
import { describeAuditLogEntry } from '@/lib/auditLog';
import type { AuditLogEntry, User } from '@/lib/api/types';

const actor: User = {
    id: 1,
    role: 'admin',
    name: 'Resnet Admin',
    first_name: null,
    last_name: null,
    email: 'admin@resnet.test',
    phone: null,
    avatar_url: null,
    bio: null,
    country: null,
    city: null,
    postal_code: null,
    tax_id: null,
    status: 'active',
    email_verified_at: null,
    last_login_at: null,
    created_at: '2026-01-01T00:00:00Z',
};

function entry(overrides: Partial<AuditLogEntry>): AuditLogEntry {
    return {
        id: 1,
        actor,
        action: 'account.data_exported',
        entity_type: 'user',
        entity_id: 1,
        meta: null,
        created_at: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

describe('describeAuditLogEntry', () => {
    it('renders a static description for events with nothing metadata-specific to add', () => {
        expect(describeAuditLogEntry(entry({ action: 'account.data_exported' }))).toBe(
            'Resnet Admin exported their account data.',
        );
    });

    it('uses metadata to make the description specific when it is available', () => {
        const log = entry({ action: 'module.deleted', entity_type: 'module', entity_id: 9, meta: { title: 'Week 1' } });
        expect(describeAuditLogEntry(log)).toBe('Resnet Admin deleted the module "Week 1".');
    });

    it('falls back to the entity id when metadata is missing', () => {
        const log = entry({ action: 'module.deleted', entity_type: 'module', entity_id: 9, meta: null });
        expect(describeAuditLogEntry(log)).toBe('Resnet Admin deleted the module "#9".');
    });

    it('branches on entity_type for an action shared by two entity types', () => {
        const submission = entry({
            action: 'grade.changed',
            entity_type: 'assignment_submission',
            meta: { final_score: 85 },
        });
        expect(describeAuditLogEntry(submission)).toBe('Resnet Admin graded a submission (85 points).');

        const attempt = entry({
            action: 'grade.changed',
            entity_type: 'evaluation_attempt',
            meta: { score_percent: 92 },
        });
        expect(describeAuditLogEntry(attempt)).toBe('Resnet Admin graded an evaluation attempt at 92%.');
    });

    it('falls back to "System" when there is no actor', () => {
        expect(describeAuditLogEntry(entry({ actor: null }))).toBe('System exported their account data.');
    });

    it('humanizes an unrecognized action key instead of breaking', () => {
        const log = entry({ action: 'course.created', entity_type: 'course', entity_id: 4 });
        expect(describeAuditLogEntry(log)).toBe('Resnet Admin performed "course created" on course #4.');
    });
});
