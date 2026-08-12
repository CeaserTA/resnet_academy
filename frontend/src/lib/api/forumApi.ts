import { apiClient } from './client';

export interface ForumSummary {
  id: number;
  title: string;
  course: {
    id: number;
    title: string;
    slug: string;
  };
  thread_count: number;
  unread_count: number;
  latest_thread: {
    id: number;
    title: string;
    last_activity_at: string;
  } | null;
}

export const forumApi = {
  /**
   * Get all forums from courses the authenticated user is enrolled in
   */
  async getAllForums(): Promise<ForumSummary[]> {
    const response = await apiClient.get<ForumSummary[]>('/forums');
    return response.data;
  },
};

