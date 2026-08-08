import { apiClient } from './client';
import type { User } from './types';

export interface ProfileStatus {
  percentage: number;
  missing: string[];
  completed: string[];
}

export interface ProfileFormState {
  first_name: string;
  last_name: string;
  phone: string;
  country: string;
  city: string;
  highest_qualification: string;
  bio?: string;
  occupation?: string;
  linkedin_profile?: string;
  portfolio_website?: string;
  avatar?: File;
}

export const profileApi = {
  async getStatus(): Promise<ProfileStatus> {
    const response = await apiClient.get('/profile/status');
    return response.data;
  },

  async updateProfile(data: ProfileFormState): Promise<User> {
    const response = await apiClient.put('/profile', data);
    return response.data;
  },

  async uploadAvatar(file: File): Promise<User> {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await apiClient.post('/account/avatar', formData);
    return response.data;
  },
};
