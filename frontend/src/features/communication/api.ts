import { apiClient } from '@/lib/api/client';
import type {
    Announcement,
    Conversation,
    ForumPost,
    ForumPostAttachmentType,
    ForumPostReport,
    ForumThread,
    Message,
    NotificationListResponse,
    Ticket,
    TicketMessage,
    User,
} from '@/lib/api/types';

// --- Conversations ---

export async function fetchConversations(): Promise<Conversation[]> {
    const { data } = await apiClient.get<{ data: Conversation[] }>('/conversations');
    return data.data;
}

export async function fetchContactableUsers(): Promise<User[]> {
    const { data } = await apiClient.get<{ data: User[] }>('/conversations/contactable');
    return data.data;
}

export async function fetchConversation(id: number): Promise<Conversation> {
    const { data } = await apiClient.get<{ data: Conversation }>(`/conversations/${id}`);
    return data.data;
}

export async function startConversation(payload: {
    recipient_id: number;
    subject?: string;
    body: string;
}): Promise<Conversation> {
    const { data } = await apiClient.post<{ data: Conversation }>('/conversations', payload);
    return data.data;
}

export async function sendMessage(conversationId: number, body: string): Promise<Message> {
    const { data } = await apiClient.post<{ data: Message }>(`/conversations/${conversationId}/messages`, { body });
    return data.data;
}

// --- Tickets ---

export async function fetchTickets(): Promise<Ticket[]> {
    const { data } = await apiClient.get<{ data: Ticket[] }>('/tickets');
    return data.data;
}

export async function fetchTicket(id: number): Promise<Ticket> {
    const { data } = await apiClient.get<{ data: Ticket }>(`/tickets/${id}`);
    return data.data;
}

export async function createTicket(payload: { subject: string; body: string; course_id?: number }): Promise<Ticket> {
    const { data } = await apiClient.post<{ data: Ticket }>('/tickets', payload);
    return data.data;
}

export async function replyToTicket(ticketId: number, body: string): Promise<TicketMessage> {
    const { data } = await apiClient.post<{ data: TicketMessage }>(`/tickets/${ticketId}/messages`, { body });
    return data.data;
}

export async function updateTicket(
    ticketId: number,
    payload: { status?: string; assigned_to?: number | null },
): Promise<Ticket> {
    const { data } = await apiClient.patch<{ data: Ticket }>(`/tickets/${ticketId}`, payload);
    return data.data;
}

// --- Forums ---

export interface ForumPostAttachmentInput {
    attachmentType?: ForumPostAttachmentType;
    attachment?: File;
    removeAttachment?: boolean;
}

function buildForumPostFormData(body: string, input: ForumPostAttachmentInput = {}): FormData {
    const formData = new FormData();
    formData.append('body', body);

    if (input.attachmentType) {
        formData.append('attachment_type', input.attachmentType);
    }
    if (input.attachment) {
        formData.append('attachment', input.attachment);
    }
    if (input.removeAttachment) {
        formData.append('remove_attachment', '1');
    }

    return formData;
}

export async function fetchForumThreads(
    courseId: number,
    params: { search?: string; mine?: boolean } = {},
): Promise<ForumThread[]> {
    const { data } = await apiClient.get<{ data: ForumThread[] }>(`/courses/${courseId}/forum/threads`, {
        params: { search: params.search || undefined, mine: params.mine ? 1 : undefined },
    });
    return data.data;
}

export async function fetchForumThread(threadId: number): Promise<ForumThread> {
    const { data } = await apiClient.get<{ data: ForumThread }>(`/forum-threads/${threadId}`);
    return data.data;
}

export async function createForumThread(
    courseId: number,
    body: string,
    input: ForumPostAttachmentInput = {},
): Promise<ForumThread> {
    const { data } = await apiClient.post<{ data: ForumThread }>(
        `/courses/${courseId}/forum/threads`,
        buildForumPostFormData(body, input),
        { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data.data;
}

export async function updateForumThread(
    threadId: number,
    payload: { is_pinned?: boolean; is_locked?: boolean },
): Promise<ForumThread> {
    const { data } = await apiClient.patch<{ data: ForumThread }>(`/forum-threads/${threadId}`, payload);
    return data.data;
}

export async function updateForumPost(
    postId: number,
    body: string,
    input: ForumPostAttachmentInput = {},
): Promise<ForumPost> {
    const formData = buildForumPostFormData(body, input);
    formData.append('_method', 'PATCH');

    const { data } = await apiClient.post<{ data: ForumPost }>(`/forum-posts/${postId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
}

export async function replyToForumThread(threadId: number, body: string): Promise<ForumPost> {
    const { data } = await apiClient.post<{ data: ForumPost }>(`/forum-threads/${threadId}/posts`, { body });
    return data.data;
}

export async function deleteForumPost(postId: number): Promise<void> {
    await apiClient.delete(`/forum-posts/${postId}`);
}

export async function reportForumPost(postId: number, reason: string): Promise<ForumPostReport> {
    const { data } = await apiClient.post<{ data: ForumPostReport }>(`/forum-posts/${postId}/reports`, { reason });
    return data.data;
}

export async function fetchForumReports(courseId: number): Promise<ForumPostReport[]> {
    const { data } = await apiClient.get<{ data: ForumPostReport[] }>(`/courses/${courseId}/forum/reports`);
    return data.data;
}

export async function updateForumReport(reportId: number, status: string): Promise<ForumPostReport> {
    const { data } = await apiClient.patch<{ data: ForumPostReport }>(`/forum-post-reports/${reportId}`, { status });
    return data.data;
}

// --- Announcements ---

export async function fetchAnnouncements(courseId: number): Promise<Announcement[]> {
    const { data } = await apiClient.get<{ data: Announcement[] }>(`/courses/${courseId}/announcements`);
    return data.data;
}

export async function createAnnouncement(courseId: number, payload: { title: string; body: string }): Promise<Announcement> {
    const { data } = await apiClient.post<{ data: Announcement }>(`/courses/${courseId}/announcements`, payload);
    return data.data;
}

export async function deleteAnnouncement(announcementId: number): Promise<void> {
    await apiClient.delete(`/announcements/${announcementId}`);
}

// --- Notifications ---

export async function fetchNotifications(page = 1): Promise<NotificationListResponse> {
    const { data } = await apiClient.get<NotificationListResponse>('/notifications', { params: { page } });
    return data;
}

export async function markNotificationRead(id: number): Promise<void> {
    await apiClient.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
    await apiClient.post('/notifications/read-all');
}
