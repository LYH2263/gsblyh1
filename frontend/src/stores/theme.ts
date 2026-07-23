import { defineStore } from 'pinia';

const THEME_MODE_STORAGE_KEY = 'insight_theme_v1';
const THEME_ACCENT_STORAGE_KEY = 'insight_theme_accent_v1';

export type ThemeMode = 'light' | 'dark';
export type ThemeAccent = 'blue' | 'green' | 'violet' | 'orange';

interface AccentConfig {
  label: string;
  primary: string;
  secondary: string;
  lightPalette: string[];
  darkPalette: string[];
}

const THEME_ACCENTS: Record<ThemeAccent, AccentConfig> = {
  blue: {
    label: '海洋蓝',
    primary: '#2563eb',
    secondary: '#0891b2',
    lightPalette: ['#2563eb', '#0891b2', '#16a34a', '#f59e0b', '#ef4444'],
    darkPalette: ['#60a5fa', '#22d3ee', '#34d399', '#fbbf24', '#f87171']
  },
  green: {
    label: '森林绿',
    primary: '#16a34a',
    secondary: '#0d9488',
    lightPalette: ['#16a34a', '#0d9488', '#2563eb', '#d97706', '#dc2626'],
    darkPalette: ['#4ade80', '#2dd4bf', '#60a5fa', '#fbbf24', '#f87171']
  },
  violet: {
    label: '紫罗兰',
    primary: '#8b5cf6',
    secondary: '#ec4899',
    lightPalette: ['#8b5cf6', '#ec4899', '#2563eb', '#0d9488', '#f59e0b'],
    darkPalette: ['#a78bfa', '#f472b6', '#60a5fa', '#2dd4bf', '#fbbf24']
  },
  orange: {
    label: '落日橙',
    primary: '#ea580c',
    secondary: '#d97706',
    lightPalette: ['#ea580c', '#d97706', '#2563eb', '#0d9488', '#dc2626'],
    darkPalette: ['#fb923c', '#fbbf24', '#60a5fa', '#2dd4bf', '#f87171']
  }
};

export const THEME_ACCENT_OPTIONS = (
  Object.entries(THEME_ACCENTS) as Array<[ThemeAccent, AccentConfig]>
).map(([key, config]) => ({
  key,
  label: config.label,
  primary: config.primary
}));

interface ThemeState {
  mode: ThemeMode;
  accent: ThemeAccent;
  initialized: boolean;
}

function applyThemeToDom(mode: ThemeMode): void {
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
  root.setAttribute('data-theme', mode);
  root.style.colorScheme = mode;
}

function normalizeHex(color: string): string {
  const hex = color.replace('#', '');
  if (hex.length === 3) {
    return `#${hex
      .split('')
      .map((item) => item + item)
      .join('')}`;
  }
  return `#${hex}`;
}

function hexToRgb(color: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(color);
  const value = Number.parseInt(normalized.slice(1), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function toHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0');
}

function mixColor(baseColor: string, targetColor: string, weight: number): string {
  const base = hexToRgb(baseColor);
  const target = hexToRgb(targetColor);

  const r = base.r + (target.r - base.r) * weight;
  const g = base.g + (target.g - base.g) * weight;
  const b = base.b + (target.b - base.b) * weight;

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getContrastTextColor(baseColor: string): string {
  const { r, g, b } = hexToRgb(baseColor);

  const toLinear = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.45 ? '#0f172a' : '#f8fafc';
}

function applyAccentToDom(accent: ThemeAccent): void {
  const root = document.documentElement;
  const config = THEME_ACCENTS[accent];
  const darkMode = root.classList.contains('dark');

  const softTarget = darkMode ? '#0f172a' : '#ffffff';
  const strongTarget = darkMode ? '#ffffff' : '#000000';
  const softWeight = darkMode ? 0.72 : 0.84;
  const strongWeight = darkMode ? 0.24 : 0.18;

  root.setAttribute('data-accent', accent);
  root.style.setProperty('--app-accent', config.primary);
  root.style.setProperty('--app-accent-secondary', config.secondary);
  root.style.setProperty('--app-accent-soft', mixColor(config.primary, softTarget, softWeight));
  root.style.setProperty('--app-accent-strong', mixColor(config.primary, strongTarget, strongWeight));
  root.style.setProperty('--app-accent-contrast', getContrastTextColor(config.primary));

  root.style.setProperty('--el-color-primary', config.primary);
  root.style.setProperty('--el-color-primary-dark-2', mixColor(config.primary, '#000000', 0.2));
  root.style.setProperty('--el-color-primary-light-3', mixColor(config.primary, '#ffffff', 0.3));
  root.style.setProperty('--el-color-primary-light-5', mixColor(config.primary, '#ffffff', 0.5));
  root.style.setProperty('--el-color-primary-light-7', mixColor(config.primary, '#ffffff', 0.7));
  root.style.setProperty('--el-color-primary-light-8', mixColor(config.primary, '#ffffff', 0.8));
  root.style.setProperty('--el-color-primary-light-9', mixColor(config.primary, '#ffffff', 0.9));
}

export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    mode: 'light',
    accent: 'blue',
    initialized: false
  }),
  getters: {
    isDark: (state) => state.mode === 'dark',
    accentLabel: (state) => THEME_ACCENTS[state.accent].label,
    primaryColor: (state) => THEME_ACCENTS[state.accent].primary,
    secondaryColor: (state) => THEME_ACCENTS[state.accent].secondary,
    chartPalette: (state) =>
      state.mode === 'dark'
        ? THEME_ACCENTS[state.accent].darkPalette
        : THEME_ACCENTS[state.accent].lightPalette
  },
  actions: {
    initFromStorage() {
      const storedMode = localStorage.getItem(THEME_MODE_STORAGE_KEY);
      const storedAccent = localStorage.getItem(THEME_ACCENT_STORAGE_KEY);

      if (storedMode === 'light' || storedMode === 'dark') {
        this.mode = storedMode;
      }

      if (storedAccent && storedAccent in THEME_ACCENTS) {
        this.accent = storedAccent as ThemeAccent;
      }

      applyThemeToDom(this.mode);
      applyAccentToDom(this.accent);
      this.initialized = true;
    },
    setTheme(mode: ThemeMode) {
      this.mode = mode;
      localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
      applyThemeToDom(mode);
      applyAccentToDom(this.accent);
    },
    setAccent(accent: ThemeAccent) {
      this.accent = accent;
      localStorage.setItem(THEME_ACCENT_STORAGE_KEY, accent);
      applyAccentToDom(accent);
    },
    toggleTheme() {
      this.setTheme(this.mode === 'dark' ? 'light' : 'dark');
    }
  }
});
