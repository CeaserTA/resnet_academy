import {
    AlertTriangle,
    Award,
    BookOpen,
    CheckCircle2,
    Circle,
    Clock,
    GraduationCap,
    LifeBuoy,
    Lock,
    Mail,
    Megaphone,
    MessageCircle,
    ShieldCheck,
    TrendingUp,
    Unlock,
    User,
    XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { BadgeTone } from '@/components/ui/Badge';
import type {
    CourseApplicationStatus,
    CourseProgressStatus,
    CourseStatus,
    EnrolmentStatus,
    ForumPostReportStatus,
    OrderStatus,
    PaymentSubmissionStatus,
    ReviewStatus,
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
    draft: { label: 'Draft', tone: 'warning', icon: Circle },
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

/**
 * Only urgent cases get a badge — a due date months away stays plain text (see CoursePlayerPage)
 * so the module list isn't full of badges for deadlines nobody needs to think about yet.
 */
export function assignmentDueBadge(dueAt: string | null, isComplete: boolean | null): StatusDisplay | null {
    if (!dueAt || isComplete) {
        return null;
    }

    const due = new Date(dueAt);
    const now = new Date();

    if (due < now) {
        return { label: 'Overdue', tone: 'danger', icon: AlertTriangle };
    }

    const daysUntilDue = (due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);

    if (daysUntilDue <= 3) {
        return { label: `Due ${due.toLocaleDateString()}`, tone: 'warning', icon: Clock };
    }

    return null;
}

const courseApplicationStatusMap: Record<CourseApplicationStatus, StatusDisplay> = {
    pending: { label: 'Pending', tone: 'warning', icon: Clock },
    approved: { label: 'Approved', tone: 'success', icon: CheckCircle2 },
    rejected: { label: 'Not accepted', tone: 'danger', icon: XCircle },
};

export function courseApplicationStatusDisplay(status: CourseApplicationStatus): StatusDisplay {
    return courseApplicationStatusMap[status];
}

const reviewStatusMap: Record<ReviewStatus, StatusDisplay> = {
    pending: { label: 'Pending', tone: 'warning', icon: Clock },
    approved: { label: 'Approved', tone: 'success', icon: CheckCircle2 },
    rejected: { label: 'Rejected', tone: 'danger', icon: XCircle },
};

export function reviewStatusDisplay(status: ReviewStatus): StatusDisplay {
    return reviewStatusMap[status];
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

/**
 * `AppNotification.type` mirrors the string literals `NotificationDispatcher` writes
 * server-side (`app/Services/Notifications/NotificationDispatcher.php`) — not a strict union on
 * the frontend, so unrecognized values fall back rather than throwing. Announcements arrive here
 * as `announcement_posted` like every other notification type — there's no separate
 * announcements surface anymore.
 */
const notificationTypeMap: Record<string, StatusDisplay> = {
    announcement_posted: { label: 'Announcement', tone: 'warning', icon: Megaphone },
    course_updated: { label: 'Course updated', tone: 'neutral', icon: BookOpen },
    certificate_issued: { label: 'Certificate', tone: 'success', icon: Award },
    new_message: { label: 'Message', tone: 'progress', icon: Mail },
    ticket_reply: { label: 'Support reply', tone: 'progress', icon: LifeBuoy },
    forum_reply: { label: 'Forum reply', tone: 'progress', icon: MessageCircle },
    forum_thread_solved: { label: 'Discussion solved', tone: 'success', icon: CheckCircle2 },
    grade_posted: { label: 'Grade posted', tone: 'success', icon: GraduationCap },
    module_unlocked: { label: 'Module unlocked', tone: 'success', icon: Unlock },
    at_risk_reminder: { label: 'At-risk check-in', tone: 'warning', icon: AlertTriangle },
    application_approved: { label: 'Application approved', tone: 'success', icon: CheckCircle2 },
    application_rejected: { label: 'Application update', tone: 'warning', icon: XCircle },
};

const defaultNotificationTypeDisplay: StatusDisplay = { label: 'Notification', tone: 'neutral', icon: Circle };

export function notificationTypeDisplay(type: string): StatusDisplay {
    return notificationTypeMap[type] ?? defaultNotificationTypeDisplay;
}
