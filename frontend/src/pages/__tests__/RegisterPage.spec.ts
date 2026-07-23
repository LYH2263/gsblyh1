import { flushPromises, mount } from '@vue/test-utils';
import ElementPlus from 'element-plus';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterPage from '@/pages/RegisterPage.vue';

const { registerMock, pushMock, successMock, errorMock } = vi.hoisted(() => ({
  registerMock: vi.fn(),
  pushMock: vi.fn(),
  successMock: vi.fn(),
  errorMock: vi.fn()
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    register: registerMock
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

describe('RegisterPage', () => {
  beforeEach(() => {
    registerMock.mockReset();
    pushMock.mockReset();
    successMock.mockReset();
    errorMock.mockReset();
  });

  it('blocks submit when password is shorter than 6 characters', async () => {
    const wrapper = mount(RegisterPage, {
      global: {
        plugins: [ElementPlus]
      }
    });

    await wrapper.get('input[name="username"]').setValue('demo_user');
    await wrapper.get('input[name="new-password"]').setValue('12345');
    await wrapper.get('form').trigger('submit.prevent');
    await flushPromises();

    expect(registerMock).not.toHaveBeenCalled();
    expect(successMock).not.toHaveBeenCalled();
  });

  it('submits registration and navigates after success', async () => {
    registerMock.mockResolvedValue(undefined);

    const wrapper = mount(RegisterPage, {
      global: {
        plugins: [ElementPlus]
      }
    });

    await wrapper.get('input[name="username"]').setValue('demo_user');
    await wrapper.get('input[name="new-password"]').setValue('123456');
    await wrapper.get('form').trigger('submit.prevent');
    await flushPromises();

    expect(registerMock).toHaveBeenCalledWith({
      username: 'demo_user',
      password: '123456'
    });
    expect(successMock).toHaveBeenCalledWith('注册成功');
    expect(pushMock).toHaveBeenCalledWith('/app/datasets');
  });
});
