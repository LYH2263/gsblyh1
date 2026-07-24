<template>
  <div class="layout-root">
    <aside class="sidebar">
      <div class="brand-block">
        <p class="brand-eyebrow">洞察看板</p>
        <h2 class="brand-title">数据工作台</h2>
      </div>

      <nav class="nav-links" aria-label="主导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ 'nav-link--active': isNavActive(item) }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <el-button class="logout-button" type="danger" plain @click="handleLogout">退出登录</el-button>
    </aside>

    <section class="content-shell">
      <header class="mobile-topbar">
        <div class="mobile-brand">
          <span class="mobile-brand-title">洞察看板</span>
        </div>
        <el-button class="mobile-logout" type="danger" plain size="small" @click="handleLogout">
          退出登录
        </el-button>
      </header>

      <nav class="mobile-nav-links" aria-label="移动端导航">
        <RouterLink
          v-for="item in navItems"
          :key="`mobile-${item.to}`"
          :to="item.to"
          class="mobile-nav-link"
          :class="{ 'mobile-nav-link--active': isNavActive(item) }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <main class="main-content">
        <div class="main-inner">
          <router-view />
        </div>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useDatasetStore } from '@/stores/datasets';

const authStore = useAuthStore();
const datasetStore = useDatasetStore();
const router = useRouter();
const route = useRoute();

onMounted(async () => {
  if (!datasetStore.datasets.length) {
    await datasetStore.fetchDatasets();
  }
});

const currentDatasetId = computed(() => {
  const idFromRoute = route.params.id ? Number(route.params.id) : null;
  return idFromRoute || datasetStore.currentDatasetId || datasetStore.datasets[0]?.id || 0;
});

const navItems = computed(() => {
  const dashboardPath = currentDatasetId.value
    ? `/app/datasets/${currentDatasetId.value}/dashboard`
    : '/app/datasets';
  const explorePath = currentDatasetId.value
    ? `/app/datasets/${currentDatasetId.value}/explore`
    : '/app/datasets';
  const inspectionPath = currentDatasetId.value
    ? `/app/datasets/${currentDatasetId.value}/inspection`
    : '/app/datasets';

  return [
    { label: '数据集', to: '/app/datasets', match: 'exact' as const },
    { label: '仪表盘', to: dashboardPath, match: 'dashboard' as const },
    { label: '数据探索', to: explorePath, match: 'explore' as const },
    { label: '质量巡检', to: inspectionPath, match: 'inspection' as const },
    { label: '设置', to: '/app/settings', match: 'settings' as const }
  ];
});

const isNavActive = (item: { to: string; match: string }) => {
  const path = route.path;
  switch (item.match) {
    case 'exact':
      return path === '/app/datasets' || path.endsWith('/import');
    case 'dashboard':
      return path.endsWith('/dashboard');
    case 'explore':
      return path.endsWith('/explore');
    case 'inspection':
      return path.endsWith('/inspection');
    case 'settings':
      return path.startsWith('/app/settings');
    default:
      return false;
  }
};

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<style scoped>
.layout-root {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  background: var(--surface-page);
}

.sidebar {
  position: sticky;
  top: 0;
  min-height: 100vh;
  padding: var(--space-6) var(--space-4);
  background: var(--sidebar-bg);
  color: var(--sidebar-text);
  border-right: 1px solid color-mix(in srgb, var(--sidebar-link) 20%, transparent);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.brand-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.brand-eyebrow {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: color-mix(in srgb, var(--sidebar-link) 75%, white);
}

.brand-title {
  font-size: 24px;
  line-height: 1.2;
  color: var(--sidebar-active-text);
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
}

.nav-link {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--sidebar-link);
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.nav-link:hover {
  background: color-mix(in srgb, var(--sidebar-active-bg) 78%, transparent);
  color: var(--sidebar-active-text);
  transform: translateX(2px);
}

.nav-link.nav-link--active {
  background: var(--sidebar-active-bg);
  color: var(--sidebar-active-text);
  font-weight: var(--font-weight-semibold);
}

.logout-button {
  width: 100%;
}

.content-shell {
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.mobile-topbar,
.mobile-nav-links {
  display: none;
}

.main-content {
  flex: 1;
  min-width: 0;
  padding: var(--space-6);
}

.main-inner {
  width: min(1320px, 100%);
  margin: 0 auto;
}

@media (max-width: 1023px) {
  .layout-root {
    grid-template-columns: 1fr;
  }

  .sidebar {
    display: none;
  }

  .mobile-topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--surface-card);
    border-bottom: 1px solid var(--border-default);
    backdrop-filter: blur(6px);
  }

  .mobile-brand-title {
    color: var(--text-primary);
    font-size: var(--text-md);
    font-weight: var(--font-weight-semibold);
  }

  .mobile-nav-links {
    display: flex;
    gap: var(--space-2);
    overflow-x: auto;
    padding: var(--space-2) var(--space-4);
    border-bottom: 1px solid var(--border-subtle);
    background: var(--surface-card);
    scrollbar-width: thin;
  }

  .mobile-nav-link {
    flex: 0 0 auto;
    padding: 6px var(--space-3);
    border-radius: 999px;
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
    transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;
  }

  .mobile-nav-link:hover {
    border-color: color-mix(in srgb, var(--app-accent) 40%, var(--border-default));
    color: var(--text-primary);
  }

  .mobile-nav-link.mobile-nav-link--active {
    background: color-mix(in srgb, var(--app-accent) 16%, var(--surface-card));
    color: var(--app-accent-strong);
    border-color: color-mix(in srgb, var(--app-accent) 46%, var(--border-default));
    font-weight: var(--font-weight-semibold);
  }

  .main-content {
    padding: var(--space-4);
  }
}

@media (max-width: 767px) {
  .mobile-topbar {
    padding: var(--space-2) var(--space-3);
  }

  .mobile-nav-links {
    padding-left: var(--space-3);
    padding-right: var(--space-3);
  }

  .main-content {
    padding: var(--space-3);
  }
}
</style>
