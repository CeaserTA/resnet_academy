import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, ChevronRight, Megaphone, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { AnnouncementComposer } from '@/features/communication/AnnouncementComposer';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/features/communication/useCommunication';
import { useAuth } from '@/lib/auth/AuthContext';
import { notificationTypeDisplay } from '@/lib/statusBadge';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { AppNotification } from '@/lib/api/types';

/**
 * Where a notification should take its reader. Only the entity type and id are stored, so a few
 * types (forum threads, modules) open the nearest page that doesn't need the course id.
 */
function linkFor(notification: AppNotification, role: string | undefined): string | null {
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

/**
 * Business rule "Notifications system" — a lightweight bell + dropdown available everywhere
 * inside the app shell. Polls in the background via TanStack Query's default refetch behavior
 * rather than a dedicated websocket (5.10 real-time delivery is explicitly optional/deferred).
 * Styled like the profile menu next to it: same panel, header row and row hover.
 */
export function NotificationBell({ className }: { className?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isComposing, setIsComposing] = useState(false);
    const { user } = useAuth();
    const { data } = useNotifications();
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const rootRef = useRef<HTMLDivElement>(null);

    const canPostAnnouncements = user?.role === 'admin' || user?.role === 'instructor';
    const unreadCount = data?.meta.unread_count ?? 0;
    const notifications = data?.data ?? [];

    // Close on a click outside the panel or on Escape, like any dropdown.
    useEffect(() => {
        if (!isOpen) return;
        const onPointerDown = (event: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen]);

    const handleOpen = () => {
        setIsOpen((prev) => !prev);
        setIsComposing(false);
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    const handleClickNotification = (notification: AppNotification) => {
        if (!notification.is_read) {
            markRead.mutate(notification.id);
        }
        const to = linkFor(notification, user?.role);
        if (to) {
            setIsOpen(false);
            navigate(to);
        }
    };

    return (
        <div ref={rootRef} className="relative">
            <button
                onClick={handleOpen}
                aria-label="Notifications"
                aria-expanded={isOpen}
                aria-haspopup="true"
                className={cn('relative flex items-center justify-center rounded-md p-2', isOpen && 'bg-surface-100', className)}
            >
                <Bell className="size-5" aria-hidden="true" />
                {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-danger-600 text-[10px] font-medium text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-80 overflow-hidden rounded-lg border border-surface-100 bg-surface-0 shadow-lg sm:w-96">
                    <div className="flex items-center justify-between border-b border-surface-100 px-3 py-2">
                        <div>
                            <p className="text-sm font-medium text-ink-900">{isComposing ? 'New announcement' : 'Notifications'}</p>
                            {!isComposing && (
                                <p className="text-xs text-ink-600">{unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {!isComposing && unreadCount > 0 && (
                                <button
                                    onClick={() => markAllRead.mutate()}
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                >
                                    <CheckCheck className="size-3.5" aria-hidden="true" />
                                    Mark all read
                                </button>
                            )}
                            {canPostAnnouncements && (
                                <button
                                    onClick={() => setIsComposing((prev) => !prev)}
                                    aria-label={isComposing ? 'Back to notifications' : 'Post an announcement'}
                                    className="rounded-md p-1 text-ink-600 hover:bg-surface-100"
                                >
                                    {isComposing ? (
                                        <X className="size-4" aria-hidden="true" />
                                    ) : (
                                        <Megaphone className="size-4" aria-hidden="true" />
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {isComposing ? (
                        <AnnouncementComposer />
                    ) : (
                        <ul className="max-h-[26rem] divide-y divide-surface-100 overflow-y-auto">
                            {notifications.map((notification) => {
                                const type = notificationTypeDisplay(notification.type);
                                const to = linkFor(notification, user?.role);

                                return (
                                    <li key={notification.id}>
                                        <button
                                            onClick={() => handleClickNotification(notification)}
                                            className={cn(
                                                'group flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-50',
                                                !notification.is_read && 'bg-blue-50',
                                            )}
                                        >
                                            <span
                                                className={cn('mt-1.5 size-2 shrink-0 rounded-full', notification.is_read ? 'bg-transparent' : 'bg-blue-600')}
                                                aria-label={notification.is_read ? undefined : 'Unread'}
                                            />
                                            <span className="flex min-w-0 flex-1 flex-col gap-1">
                                                <span className="flex items-center justify-between gap-2">
                                                    <Badge label={type.label} tone={type.tone} icon={type.icon} />
                                                    {notification.sent_at && (
                                                        <span className="shrink-0 text-xs text-ink-600">{formatRelativeTime(notification.sent_at)}</span>
                                                    )}
                                                </span>
                                                <span className="text-sm font-medium text-ink-900">{notification.title}</span>
                                                {notification.body && <span className="line-clamp-2 text-xs text-ink-600">{notification.body}</span>}
                                            </span>
                                            {to && (
                                                <ChevronRight className="mt-1 size-4 shrink-0 text-ink-300 group-hover:text-blue-600" aria-hidden="true" />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}

                            {notifications.length === 0 && (
                                <li className="px-3 py-8 text-center text-sm text-ink-600">You're all caught up.</li>
                            )}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
