import { CheckCircle2, Circle, Clock, Lock, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { BadgeTone } from '@/components/ui/Badge';
import type {
    CourseProgressStatus,
    CourseStatus,
    EnrolmentStatus,
    ForumPostReportStatus,
    OrderStatus,
    TicketStatus,
} from '@/lib/api/types';

interface StatusDisplay {
    label: string;
    tone: BadgeTone;
    icon: LucideIcon;
}

/**
 * Label text mirrors the schema.sql enum values verbatim (ui-context.md §1/§10) — no
 * per-screen synonyms like "Ongoing" or "Active".
 */
const courseStatusMap: Record<CourseStatus, StatusDisplay> = {
    draft: { label: 'Draft', tone: 'neutral', icon: Circle },
    published: { label: 'Published', tone: 'success', icon: CheckCircle2 },
    archived: { label: 'Archived', tone: 'neutral', icon: Lock },
};

const enrolmentStatusMap: Record<EnrolmentStatus, StatusDisplay> = {
    confirmed: { label: 'Confirmed', tone: 'success', icon: CheckCircle2 },
    withdrawn: { label: 'Withdrawn', tone: 'neutral', icon: XCircle },
};

const orderStatusMap: Record<OrderStatus, StatusDisplay> = {
    pending: { label: 'Pending', tone: 'warning', icon: Clock },
    paid: { label: 'Paid', tone: 'success', icon: CheckCircle2 },
    failed: { label: 'Failed', tone: 'danger', icon: XCircle },
    refunded: { label: 'Refunded', tone: 'neutral', icon: Circle },
};

export function courseStatusDisplay(status: CourseStatus): StatusDisplay {
    return courseStatusMap[status];
}

export function enrolmentStatusDisplay(status: EnrolmentStatus): StatusDisplay {
    return enrolmentStatusMap[status];
}

export function orderStatusDisplay(status: OrderStatus): StatusDisplay {
    return orderStatusMap[status];
}

const courseProgressStatusMap: Record<CourseProgressStatus, StatusDisplay> = {
    not_started: { label: 'Not started', tone: 'neutral', icon: Circle },
    in_progress: { label: 'In progress', tone: 'progress', icon: Circle },
    completed: { label: 'Completed', tone: 'success', icon: CheckCircle2 },
};

export function courseProgressStatusDisplay(status: CourseProgressStatus): StatusDisplay {
    return courseProgressStatusMap[status];
}

const ticketStatusMap: Record<TicketStatus, StatusDisplay> = {
    open: { label: 'Open', tone: 'warning', icon: Circle },
    in_progress: { label: 'In progress', tone: 'progress', icon: Clock },
    resolved: { label: 'Resolved', tone: 'success', icon: CheckCircle2 },
    closed: { label: 'Closed', tone: 'neutral', icon: Lock },
};

export function ticketStatusDisplay(status: TicketStatus): StatusDisplay {
    return ticketStatusMap[status];
}

const forumPostReportStatusMap: Record<ForumPostReportStatus, StatusDisplay> = {
    pending: { label: 'Pending', tone: 'warning', icon: Clock },
    reviewed: { label: 'Reviewed', tone: 'success', icon: CheckCircle2 },
    dismissed: { label: 'Dismissed', tone: 'neutral', icon: XCircle },
};

export function forumPostReportStatusDisplay(status: ForumPostReportStatus): StatusDisplay {
    return forumPostReportStatusMap[status];
}
