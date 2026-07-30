import type { AuditLogEntry } from '@/lib/api/types';

type Describer = (log: AuditLogEntry) => string;

function metaString(log: AuditLogEntry, key: string): string | null {
    const value = log.meta?.[key];
    return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : null;
}

/**
 * Centralized event key -> human-readable description mapping for the audit log (dashboard
 * "Recent activity" feed and the full Audit Log page both use this — the raw `action` string and
 * `meta` shape are never changed, only how they're displayed). A value can be a plain string for
 * events with nothing metadata-specific to add, or a function that reads `log.meta` to produce a
 * more specific sentence when the data is actually there — falling back to a generic phrase
 * otherwise, never a fabricated name the meta doesn't actually contain.
 *
 * To add a new event: add one entry here with the exact `action` string the backend logs.
 * Nothing else needs to change — this is presentation only, the logging call sites are untouched.
 */
const EVENT_DESCRIPTIONS: Record<string, string | Describer> = {
    'account.data_exported': 'exported their account data',
    'account.deactivation_requested': 'deactivated their account',
    'account.logged_out_other_devices': 'signed out of every other session',
    'account.password_changed': 'changed their password',

    'user.provisioned': (log) => {
        const role = metaString(log, 'role');
        return role ? `provisioned a new ${role} account` : 'provisioned a new account';
    },
    'user.role_changed': (log) => {
        const from = metaString(log, 'from');
        const to = metaString(log, 'to');
        return from && to ? `changed a user's role from ${from} to ${to}` : "changed a user's role";
    },
    'user.status_changed': (log) => {
        const to = metaString(log, 'to');
        return to ? `changed a user's status to ${to}` : "changed a user's status";
    },

    'module.deleted': (log) => `deleted the module "${metaString(log, 'title') ?? `#${log.entity_id}`}"`,
    'module.restored': (log) => `restored the module "${metaString(log, 'title') ?? `#${log.entity_id}`}"`,
    'module.purged': (log) => `permanently purged the module "${metaString(log, 'title') ?? `#${log.entity_id}`}"`,

    'enrolment.confirmed': 'confirmed an enrolment',
    'enrolment.status_changed': (log) => {
        const to = metaString(log, 'to');
        return to === 'withdrawn' ? 'withdrew a student from a course' : `changed an enrolment status to ${to ?? 'a new status'}`;
    },
    'enrolment.bulk_import': (log) => {
        const imported = metaString(log, 'imported') ?? '0';
        const skipped = metaString(log, 'skipped') ?? '0';
        return `bulk-imported ${imported} enrolment(s) (${skipped} skipped)`;
    },

    'grade.changed': (log) => {
        if (log.entity_type === 'evaluation_attempt') {
            const score = metaString(log, 'score_percent');
            return score ? `graded an evaluation attempt at ${score}%` : 'graded an evaluation attempt';
        }

        const finalScore = metaString(log, 'final_score');
        return finalScore ? `graded a submission (${finalScore} points)` : 'graded a submission';
    },

    'order.payment_recorded': (log) => {
        const to = metaString(log, 'to');
        return to ? `recorded a payment, updating the balance to ${to}` : 'recorded a payment';
    },
    'order.payment_confirmed': (log) => {
        const to = metaString(log, 'to');
        return to ? `confirmed a payment, updating the balance to ${to}` : 'confirmed a payment';
    },
    'order.payment_rejected': (log) => {
        const amount = metaString(log, 'amount');
        return amount ? `rejected a payment of ${amount}` : 'rejected a payment';
    },
};

/** `enrolment.confirmed` -> "enrolment confirmed" — used only when an action has no mapping above. */
function humanizeAction(action: string): string {
    return action.replace(/[._]/g, ' ');
}

/**
 * Renders one audit log row as a natural-language sentence, e.g. "Resnet Admin deleted the
 * module \"Week 1\"." Unknown action keys (anything not yet added to EVENT_DESCRIPTIONS) still
 * render sensibly via a humanized fallback rather than breaking.
 */
export function describeAuditLogEntry(log: AuditLogEntry): string {
    const actorName = log.actor?.name ?? 'System';
    const description = EVENT_DESCRIPTIONS[log.action];

    const detail =
        typeof description === 'function'
            ? description(log)
            : (description ?? `performed "${humanizeAction(log.action)}" on ${log.entity_type} #${log.entity_id}`);

    return `${actorName} ${detail}.`;
}
