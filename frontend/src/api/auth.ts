import apiClient from './client';
import type { User } from '@/types/models';

export interface AuthPayload {
  token: string;
  user: User;
}

export const authApi = {
  register(payload: { username: string; password: string }) {
    return apiClient.post<never, AuthPayload>('/auth/register', payload);
  },
  login(payload: { username: string; password: string }) {
    return apiClient.post<never, AuthPayload>('/auth/login', payload);
  },
  me() {
    return apiClient.get<never, User>('/auth/me');
  }
};
