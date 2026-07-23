<template>
  <el-card class="section-card" shadow="never" :class="[`section-card--${padding}`]">
    <template v-if="title || $slots.actions" #header>
      <div class="section-card__header">
        <h2 v-if="title" class="section-card__title">{{ title }}</h2>
        <div v-if="$slots.actions" class="section-card__actions">
          <slot name="actions" />
        </div>
      </div>
    </template>
    <slot />
  </el-card>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    padding?: 'sm' | 'md' | 'lg';
  }>(),
  {
    title: '',
    padding: 'md'
  }
);
</script>

<style scoped>
.section-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.section-card__title {
  font-size: var(--text-lg);
  line-height: 1.25;
  color: var(--text-primary);
  font-weight: var(--font-weight-semibold);
}

.section-card__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.section-card--sm :deep(.el-card__body) {
  padding: var(--space-3) var(--space-4);
}

.section-card--md :deep(.el-card__body) {
  padding: var(--space-4) var(--space-5);
}

.section-card--lg :deep(.el-card__body) {
  padding: var(--space-5) var(--space-6);
}

@media (max-width: 767px) {
  .section-card__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
