import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { pinia } from '@/stores';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/app/datasets'
    },
    {
      path: '/login',
      component: () => import('@/pages/LoginPage.vue')
    },
    {
      path: '/register',
      component: () => import('@/pages/RegisterPage.vue')
    },
    {
      path: '/app',
      component: () => import('@/layout/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: 'datasets',
          component: () => import('@/pages/DatasetsPage.vue')
        },
        {
          path: 'datasets/:id/import',
          component: () => import('@/pages/ImportPage.vue')
        },
        {
          path: 'datasets/:id/dashboard',
          component: () => import('@/pages/DashboardPage.vue')
        },
        {
          path: 'datasets/:id/explore',
          component: () => import('@/pages/ExplorePage.vue')
        },
        {
          path: 'datasets/:id/quality',
          component: () => import('@/pages/QualityPage.vue')
        },
        {
          path: 'settings',
          component: () => import('@/pages/SettingsPage.vue')
        }
      ]
    }
  ]
});

router.beforeEach((to) => {
  const authStore = useAuthStore(pinia);

  if (!authStore.initialized) {
    authStore.initFromStorage();
  }

  if (to.meta.requiresAuth && !authStore.token) {
    return '/login';
  }

  if ((to.path === '/login' || to.path === '/register') && authStore.token) {
    return '/app/datasets';
  }

  return true;
});

export default router;
