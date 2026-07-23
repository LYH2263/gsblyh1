import { defineStore } from 'pinia';
import { authApi } from '@/api/auth';
import type { User } from '@/types/models';

const AUTH_STORAGE_KEY = 'insight_auth_v1';

interface AuthState {
  token: string;
  user: User | null;
  initialized: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: '',
    user: null,
    initialized: false
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token)
  },
  actions: {
    initFromStorage() {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);

      if (!raw) {
        this.initialized = true;
        return;
      }

      try {
        const parsed = JSON.parse(raw) as { token?: string; user?: User };
        this.token = parsed.token ?? '';
        this.user = parsed.user ?? null;
      } finally {
        this.initialized = true;
      }
    },
    persist() {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          token: this.token,
          user: this.user
        })
      );
    },
    async register(payload: { username: string; password: string }) {
      const result = await authApi.register(payload);
      this.token = result.token;
      this.user = result.user;
      this.persist();
    },
    async login(payload: { username: string; password: string }) {
      const result = await authApi.login(payload);
      this.token = result.token;
      this.user = result.user;
      this.persist();
    },
    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }
});
