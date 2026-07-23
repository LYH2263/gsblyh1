import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/api/auth';

vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn()
  }
}));

describe('authStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('writes token after login and restores from storage', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      token: 'token-123',
      user: { id: 1, username: 'demo' }
    });

    const store = useAuthStore();

    await store.login({
      username: 'demo',
      password: '123456'
    });

    expect(store.token).toBe('token-123');

    const restoredStore = useAuthStore();
    restoredStore.token = '';
    restoredStore.user = null;
    restoredStore.initialized = false;
    restoredStore.initFromStorage();

    expect(restoredStore.token).toBe('token-123');
    expect(restoredStore.user?.username).toBe('demo');
    expect(restoredStore.initialized).toBe(true);
  });
});
