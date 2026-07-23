import { flushPromises, mount } from '@vue/test-utils';
import ElementPlus from 'element-plus';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '@/pages/LoginPage.vue';

const { loginMock, pushMock, successMock, errorMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  pushMock: vi.fn(),
  successMock: vi.fn(),
  errorMock: vi.fn()
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    login: loginMock
  })
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock
  })
}));

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus');

  return {
    ...actual,
    ElMessage: {
      success: successMock,
      error: errorMock
    }
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset();
    pushMock.mockReset();
    successMock.mockReset();
    errorMock.mockReset();
  });

  it('blocks submit when required fields are empty', async () => {
    const wrapper = mount(LoginPage, {
      global: {
        plugins: [ElementPlus]
      }
    });

    await wrapper.get('form').trigger('submit.prevent');
    await flushPromises();

    expect(loginMock).not.toHaveBeenCalled();
    expect(successMock).not.toHaveBeenCalled();
  });

  it('submits credentials and navigates after a successful login', async () => {
    loginMock.mockResolvedValue(undefined);

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [ElementPlus]
      }
    });

    await wrapper.get('input[name="username"]').setValue('test_user');
    await wrapper.get('input[name="password"]').setValue('test123456');
    await wrapper.get('form').trigger('submit.prevent');
    await flushPromises();

    expect(loginMock).toHaveBeenCalledWith({
      username: 'test_user',
      password: 'test123456'
    });
    expect(successMock).toHaveBeenCalledWith('登录成功');
    expect(pushMock).toHaveBeenCalledWith('/app/datasets');
  });
});
