<template>
  <div class="page-shell">
    <SectionCard>
      <PageHeaderBar title="系统设置" description="个性化主题模式与品牌色，设置会自动持久化。" />

      <el-form label-position="top" class="settings-form">
        <el-form-item label="暗黑主题">
          <el-space wrap>
            <el-switch
              :model-value="themeStore.isDark"
              inline-prompt
              active-text="暗"
              inactive-text="亮"
              @change="handleThemeSwitch"
            />
            <span class="theme-label">当前主题：{{ themeStore.isDark ? '深色' : '浅色' }}</span>
          </el-space>
        </el-form-item>

        <el-form-item label="主题色">
          <el-radio-group :model-value="themeStore.accent" class="accent-group" @change="handleAccentChange">
            <el-radio-button v-for="option in accentOptions" :key="option.key" :label="option.key">
              <span class="accent-option">
                <span class="accent-dot" :style="{ backgroundColor: option.primary }" />
                {{ option.label }}
              </span>
            </el-radio-button>
          </el-radio-group>
          <p class="theme-label accent-tip">
            当前主题色：{{ themeStore.accentLabel }}（{{ themeStore.primaryColor }}）
          </p>
        </el-form-item>
      </el-form>

      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="主题模式与主题色会持久化到 localStorage，刷新后自动恢复。"
      />
    </SectionCard>
  </div>
</template>

<script setup lang="ts">
import PageHeaderBar from '@/components/ui/PageHeaderBar.vue';
import SectionCard from '@/components/ui/SectionCard.vue';
import { THEME_ACCENT_OPTIONS, type ThemeAccent, useThemeStore } from '@/stores/theme';

const themeStore = useThemeStore();
const accentOptions = THEME_ACCENT_OPTIONS;

const handleThemeSwitch = (value: string | number | boolean) => {
  themeStore.setTheme(value ? 'dark' : 'light');
};

const handleAccentChange = (value: string | number | boolean) => {
  if (typeof value !== 'string') {
    return;
  }

  themeStore.setAccent(value as ThemeAccent);
};
</script>

<style scoped>
.settings-form {
  margin-top: var(--space-4);
  margin-bottom: var(--space-3);
}

.theme-label {
  color: var(--text-secondary);
}

.accent-tip {
  margin-top: var(--space-2);
  font-size: var(--text-sm);
}

.accent-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.accent-group :deep(.el-radio-button__inner) {
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-default);
  background: var(--surface-card);
  color: var(--text-secondary);
  box-shadow: none;
}

.accent-group :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  color: var(--app-accent-strong);
  border-color: color-mix(in srgb, var(--app-accent) 50%, var(--border-default));
  background: color-mix(in srgb, var(--app-accent) 12%, var(--surface-card));
}

.accent-option {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.accent-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.2);
}
</style>
