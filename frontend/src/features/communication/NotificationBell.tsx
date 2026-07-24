import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Megaphone, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { AnnouncementComposer } from '@/features/communication/AnnouncementComposer';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/features/communication/useCommunication';
import { useAuth } from '@/lib/auth/AuthContext';
import { notificationTypeDisplay } from '@/lib/statusBadge';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/lib/api/types';

/**
 * Business rule "Notifications system" — a lightweight bell + dropdown available everywhere
 * inside the app shell. Polls in the background via TanStack Query's default refetch behavior
 * rather than a dedicated websocket (5.10 real-time delivery is explicitly optional/deferred).
 */
export function NotificationBell({ className }: { className?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isComposing, setIsComposing] = useState(false);
    const { user } = useAuth();
    const { data } = useNotifications();
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();
    const queryClient = useQueryClient();

    const canPostAnnouncements = user?.role === 'admin' || user?.role === 'instructor';
    const unreadCount = data?.meta.unread_count ?? 0;
    const notifications = data?.data ?? [];

    const handleOpen = () => {
        setIsOpen((prev) => !prev);
        setIsComposing(false);
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    const handleClickNotification = (notification: AppNotification) => {
        if (!notification.is_read) {
            markRead.mutate(notification.id);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleOpen}
                aria-label="Notifications"
                className={cn('relative flex items-center justify-center rounded-md p-2', className)}
            >
                <Bell className="size-5" aria-hidden="true" />
                {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-danger-600 text-[10px] font-medium text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-lg border border-surface-100 bg-surface-0 shadow-lg">
                    <div className="flex items-center justify-between border-b border-surface-100 px-3 py-2">
                        <span className="text-sm font-medium text-ink-900">{isComposing ? 'New announcement' : 'Notifications'}</span>
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
                        <ul className="max-h-96 overflow-y-auto">
                            {notifications.map((notification) => {
                                const type = notificationTypeDisplay(notification.type);

                                return (
                                    <li key={notification.id}>
                                        <button
                                            onClick={() => handleClickNotification(notification)}
                                            className={cn(
                                                'flex w-full flex-col gap-1 border-b border-surface-100 px-3 py-2 text-left last:border-0 hover:bg-surface-50',
                                                !notification.is_read && 'bg-blue-600/5',
                                            )}
                                        >
                                            <Badge label={type.label} tone={type.tone} icon={type.icon} className="self-start" />
                                            <span className="text-sm font-medium text-ink-900">{notification.title}</span>
                                            {notification.body && <span className="text-xs text-ink-600">{notification.body}</span>}
                                        </button>
                                    </li>
                                );
                            })}

                            {notifications.length === 0 && (
                                <li className="px-3 py-6 text-center text-sm text-ink-600">You're all caught up.</li>
                            )}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
