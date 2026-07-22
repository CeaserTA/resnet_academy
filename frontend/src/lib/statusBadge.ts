import { CheckCircle2, Circle, Clock, GraduationCap, Lock, ShieldCheck, TrendingUp, User, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { BadgeTone } from '@/components/ui/Badge';
import type {
    CourseProgressStatus,
    CourseStatus,
    EnrolmentStatus,
    ForumPostReportStatus,
    OrderStatus,
    PaymentSubmissionStatus,
    TicketStatus,
    UserRole,
    UserStatus,
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
    partial: { label: 'Partial', tone: 'warning', icon: TrendingUp },
    paid: { label: 'Paid', tone: 'success', icon: CheckCircle2 },
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

const userRoleMap: Record<UserRole, StatusDisplay> = {
    admin: { label: 'Admin', tone: 'progress', icon: ShieldCheck },
    instructor: { label: 'Instructor', tone: 'success', icon: GraduationCap },
    student: { label: 'Student', tone: 'neutral', icon: User },
};

export function userRoleDisplay(role: UserRole): StatusDisplay {
    return userRoleMap[role];
}

const userStatusMap: Record<UserStatus, StatusDisplay> = {
    active: { label: 'Active', tone: 'success', icon: CheckCircle2 },
    suspended: { label: 'Suspended', tone: 'warning', icon: Clock },
    deactivated: { label: 'Deactivated', tone: 'neutral', icon: XCircle },
};

export function userStatusDisplay(status: UserStatus): StatusDisplay {
    return userStatusMap[status];
}

const paymentSubmissionStatusMap: Record<PaymentSubmissionStatus, StatusDisplay> = {
    pending: { label: 'Awaiting confirmation', tone: 'warning', icon: Clock },
    confirmed: { label: 'Confirmed', tone: 'success', icon: CheckCircle2 },
    rejected: { label: 'Rejected', tone: 'danger', icon: XCircle },
};

export function paymentSubmissionStatusDisplay(status: PaymentSubmissionStatus): StatusDisplay {
    return paymentSubmissionStatusMap[status];
}
