import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useThemeStore } from '@/stores/theme';

describe('themeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-accent');
    document.documentElement.style.colorScheme = '';
    document.documentElement.style.removeProperty('--el-color-primary');
    document.documentElement.style.removeProperty('--app-accent-soft');
    document.documentElement.style.removeProperty('--app-accent-strong');
    document.documentElement.style.removeProperty('--app-accent-contrast');
  });

  it('toggles dark mode and restores from storage', () => {
    const store = useThemeStore();

    store.setTheme('dark');

    expect(store.isDark).toBe(true);
    expect(localStorage.getItem('insight_theme_v1')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');

    const restoredStore = useThemeStore();
    restoredStore.mode = 'light';
    restoredStore.initialized = false;
    restoredStore.initFromStorage();

    expect(restoredStore.mode).toBe('dark');
    expect(restoredStore.initialized).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('switches accent and persists Element Plus primary color', () => {
    const store = useThemeStore();

    store.setAccent('violet');

    expect(store.accent).toBe('violet');
    expect(store.primaryColor).toBe('#8b5cf6');
    expect(localStorage.getItem('insight_theme_accent_v1')).toBe('violet');
    expect(document.documentElement.getAttribute('data-accent')).toBe('violet');
    expect(document.documentElement.style.getPropertyValue('--el-color-primary')).toBe('#8b5cf6');
    expect(document.documentElement.style.getPropertyValue('--app-accent-soft')).not.toBe('');
    expect(document.documentElement.style.getPropertyValue('--app-accent-strong')).not.toBe('');
    expect(document.documentElement.style.getPropertyValue('--app-accent-contrast')).not.toBe('');

    const restoredStore = useThemeStore();
    restoredStore.accent = 'blue';
    restoredStore.initialized = false;
    restoredStore.initFromStorage();

    expect(restoredStore.accent).toBe('violet');
    expect(restoredStore.accentLabel).toBe('紫罗兰');
  });
});
