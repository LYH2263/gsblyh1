import axios, { AxiosError } from 'axios';
import type { ApiResponse } from '@/types/api';

const AUTH_STORAGE_KEY = 'insight_auth_v1';

const getToken = (): string | null => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token ?? null;
  } catch {
    return null;
  }
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10000
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const payload = response.data as ApiResponse<unknown>;

    if (payload.code !== 0) {
      return Promise.reject(new Error(payload.message));
    }

    return payload.data;
  },
  (error: AxiosError<{ message?: string }>) => {
    const message = error.response?.data?.message ?? error.message;
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
