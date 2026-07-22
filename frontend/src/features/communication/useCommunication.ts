import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createAnnouncement,
    createForumThread,
    createTicket,
    deleteAnnouncement,
    deleteForumPost,
    fetchAnnouncements,
    fetchContactableUsers,
    fetchConversation,
    fetchConversations,
    fetchForumReports,
    fetchForumThread,
    fetchForumThreads,
    fetchNotifications,
    fetchTicket,
    fetchTickets,
    markAllNotificationsRead,
    markNotificationRead,
    replyToForumThread,
    replyToTicket,
    reportForumPost,
    sendMessage,
    startConversation,
    updateForumPost,
    updateForumReport,
    updateForumThread,
    updateTicket,
    type ForumPostAttachmentInput,
} from '@/features/communication/api';

// --- Conversations ---

export function useConversations() {
    return useQuery({ queryKey: ['conversations'], queryFn: fetchConversations });
}

export function useConversation(id: number) {
    return useQuery({
        queryKey: ['conversations', id],
        queryFn: () => fetchConversation(id),
        enabled: Number.isFinite(id),
    });
}

export function useContactableUsers() {
    return useQuery({ queryKey: ['conversations', 'contactable'], queryFn: fetchContactableUsers });
}

export function useStartConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: startConversation,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
    });
}

export function useSendMessage(conversationId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: string) => sendMessage(conversationId, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations', conversationId] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
    });
}

// --- Tickets ---

export function useTickets() {
    return useQuery({ queryKey: ['tickets'], queryFn: fetchTickets });
}

export function useTicket(id: number) {
    return useQuery({ queryKey: ['tickets', id], queryFn: () => fetchTicket(id), enabled: Number.isFinite(id) });
}

export function useCreateTicket() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createTicket,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
    });
}

export function useReplyToTicket(ticketId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: string) => replyToTicket(ticketId, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets', ticketId] }),
    });
}

export function useUpdateTicket(ticketId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: { status?: string; assigned_to?: number | null }) => updateTicket(ticketId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets', ticketId] });
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
        },
    });
}

// --- Forums ---

export function useForumThreads(courseId: number, params: { search?: string; mine?: boolean } = {}) {
    return useQuery({
        queryKey: ['courses', courseId, 'forum-threads', params.search ?? null, params.mine ?? false],
        queryFn: () => fetchForumThreads(courseId, params),
        enabled: Number.isFinite(courseId),
    });
}

export function useForumThread(threadId: number, enabled = true) {
    return useQuery({
        queryKey: ['forum-threads', threadId],
        queryFn: () => fetchForumThread(threadId),
        enabled: Number.isFinite(threadId) && enabled,
    });
}

function invalidateForumFeed(queryClient: ReturnType<typeof useQueryClient>, courseId: number, threadId?: number) {
    queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'forum-threads'] });
    if (threadId) {
        queryClient.invalidateQueries({ queryKey: ['forum-threads', threadId] });
    }
}

export function useCreateForumThread(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ body, ...input }: { body: string } & ForumPostAttachmentInput) =>
            createForumThread(courseId, body, input),
        onSuccess: () => invalidateForumFeed(queryClient, courseId),
    });
}

export function useUpdateForumThread(courseId: number, threadId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: { is_pinned?: boolean; is_locked?: boolean }) => updateForumThread(threadId, payload),
        onSuccess: () => invalidateForumFeed(queryClient, courseId, threadId),
    });
}

export function useReplyToForumThread(courseId: number, threadId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: string) => replyToForumThread(threadId, body),
        onSuccess: () => invalidateForumFeed(queryClient, courseId, threadId),
    });
}

export function useUpdateForumPost(courseId: number, threadId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ postId, body, ...input }: { postId: number; body: string } & ForumPostAttachmentInput) =>
            updateForumPost(postId, body, input),
        onSuccess: () => invalidateForumFeed(queryClient, courseId, threadId),
    });
}

export function useDeleteForumPost(courseId: number, threadId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (postId: number) => deleteForumPost(postId),
        onSuccess: () => invalidateForumFeed(queryClient, courseId, threadId),
    });
}

export function useReportForumPost() {
    return useMutation({
        mutationFn: ({ postId, reason }: { postId: number; reason: string }) => reportForumPost(postId, reason),
    });
}

export function useForumReports(courseId: number) {
    return useQuery({
        queryKey: ['courses', courseId, 'forum-reports'],
        queryFn: () => fetchForumReports(courseId),
        enabled: Number.isFinite(courseId),
    });
}

export function useUpdateForumReport(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ reportId, status }: { reportId: number; status: string }) => updateForumReport(reportId, status),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'forum-reports'] }),
    });
}

// --- Announcements ---

export function useAnnouncements(courseId: number) {
    return useQuery({
        queryKey: ['courses', courseId, 'announcements'],
        queryFn: () => fetchAnnouncements(courseId),
        enabled: Number.isFinite(courseId),
    });
}

export function useCreateAnnouncement(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: { title: string; body: string }) => createAnnouncement(courseId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'announcements'] }),
    });
}

export function useDeleteAnnouncement(courseId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (announcementId: number) => deleteAnnouncement(announcementId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'announcements'] }),
    });
}

// --- Notifications ---

export function useNotifications(page = 1) {
    return useQuery({ queryKey: ['notifications', page], queryFn: () => fetchNotifications(page) });
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: markNotificationRead,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    });
}

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: markAllNotificationsRead,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    });
}
