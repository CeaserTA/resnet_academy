import type { AppNotification } from '@/lib/api/types';

/**
 * Where a notification should take its reader. Only the entity type and id are stored, so a few
 * types (forum threads, modules) open the nearest page that doesn't need the course id.
 */
export function notificationLink(notification: AppNotification, role: string | undefined): string | null {
    const id = notification.related_entity_id;
    const isStaff = role === 'admin' || role === 'instructor';
    switch (notification.related_entity_type) {
        case 'conversation':
            return id ? `/messages/${id}` : '/messages';
        case 'ticket':
            return id ? `/tickets?ticket=${id}` : '/tickets';
        case 'forum_thread':
            return '/forums';
        case 'certificate':
            return isStaff ? '/admin/certificates' : '/certificates';
        case 'course':
            return id ? (isStaff ? `/admin/courses/${id}/modules` : `/learn/courses/${id}`) : null;
        case 'course_application':
            return isStaff ? '/admin/applications' : '/my-courses';
        case 'enrolment':
            return isStaff ? '/admin/enrolments' : '/my-courses';
        case 'payment_submission':
            return isStaff ? '/admin/payments' : '/payments';
        case 'module':
        case 'assignment_submission':
        case 'evaluation_attempt':
            return isStaff ? null : '/my-courses';
        default:
            return null;
    }
}
