<template>
  <div class="page-shell dashboard-page">
    <PageHeaderBar title="仪表盘" description="查看关键指标、趋势变化与结构分布。">
      <template #actions>
        <el-button class="mobile-filter-button" @click="filterDrawerVisible = true">筛选条件</el-button>
        <el-button :loading="analyticsStore.loading" @click="loadAnalytics">刷新数据</el-button>
      </template>
    </PageHeaderBar>

    <SectionCard title="筛选条件" class="filter-card filter-card--desktop">
      <el-form :inline="true" :model="filterForm" class="filter-toolbar">
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="filterForm.category" placeholder="可选" />
        </el-form-item>
        <el-form-item label="地区">
          <el-input v-model="filterForm.region" placeholder="可选" />
        </el-form-item>
        <el-form-item label="渠道">
          <el-input v-model="filterForm.channel" placeholder="可选" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="analyticsStore.loading" @click="loadAnalytics">
            应用筛选
          </el-button>
        </el-form-item>
      </el-form>
    </SectionCard>

    <el-drawer
      v-model="filterDrawerVisible"
      title="筛选条件"
      direction="rtl"
      size="88%"
      class="filter-drawer"
      append-to-body
    >
      <el-form :model="filterForm" label-position="top" class="filter-drawer-form">
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            class="full-width"
            type="daterange"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="filterForm.category" placeholder="可选" />
        </el-form-item>
        <el-form-item label="地区">
          <el-input v-model="filterForm.region" placeholder="可选" />
        </el-form-item>
        <el-form-item label="渠道">
          <el-input v-model="filterForm.channel" placeholder="可选" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="drawer-actions">
          <el-button @click="resetFilters">重置</el-button>
          <el-button type="primary" :loading="analyticsStore.loading" @click="applyDrawerFilters">
            应用筛选
          </el-button>
        </div>
      </template>
    </el-drawer>

    <div class="kpi-grid">
      <div class="kpi-card">
        <p class="kpi-label">总额</p>
        <p class="kpi-value">{{ formatAmount(analyticsStore.summary.totalAmount) }}</p>
      </div>
      <div class="kpi-card">
        <p class="kpi-label">记录数</p>
        <p class="kpi-value">{{ formatCount(analyticsStore.summary.count) }}</p>
      </div>
      <div class="kpi-card">
        <p class="kpi-label">平均值</p>
        <p class="kpi-value">{{ formatAmount(analyticsStore.summary.avg) }}</p>
      </div>
      <div class="kpi-card">
        <p class="kpi-label">对比变化（%）</p>
        <p class="kpi-value kpi-value--accent">{{ formatPercent(analyticsStore.summary.compareValue) }}%</p>
      </div>
    </div>

    <div class="chart-grid">
      <div class="chart-panel">
        <p class="chart-title">时间趋势</p>
        <VChart class="chart-canvas" :option="trendOption" autoresize />
      </div>
      <div class="chart-panel">
        <p class="chart-title">分类排行</p>
        <VChart class="chart-canvas" :option="topOption" autoresize @click="onTopClick" />
      </div>
      <div class="chart-panel">
        <p class="chart-title">渠道占比</p>
        <VChart class="chart-canvas" :option="pieOption" autoresize />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeaderBar from '@/components/ui/PageHeaderBar.vue';
import SectionCard from '@/components/ui/SectionCard.vue';
import { useAnalyticsStore } from '@/stores/analytics';
import { useThemeStore } from '@/stores/theme';
import { buildPieOption, buildTopOption, buildTrendOption } from '@/utils/charts';

const route = useRoute();
const router = useRouter();
const analyticsStore = useAnalyticsStore();
const themeStore = useThemeStore();

const amountFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const countFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 0
});
const percentFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const datasetId = computed(() => Number(route.params.id));

const dateRange = ref<[string, string] | null>(null);
const filterDrawerVisible = ref(false);
const filterForm = reactive({
  category: '',
  region: '',
  channel: ''
});

const trendOption = computed(() =>
  buildTrendOption(analyticsStore.trend, {
    dark: themeStore.isDark,
    lineColor: themeStore.primaryColor
  })
);

const topOption = computed(() =>
  buildTopOption(analyticsStore.top, {
    dark: themeStore.isDark,
    barColor: themeStore.secondaryColor
  })
);

const pieOption = computed(() =>
  buildPieOption(analyticsStore.pie, {
    dark: themeStore.isDark,
    piePalette: themeStore.chartPalette
  })
);

const buildFilters = () => ({
  from: dateRange.value?.[0],
  to: dateRange.value?.[1],
  category: filterForm.category || undefined,
  region: filterForm.region || undefined,
  channel: filterForm.channel || undefined
});

const loadAnalytics = async () => {
  if (!datasetId.value) {
    return;
  }

  await analyticsStore.fetchAll(datasetId.value, buildFilters(), {
    topBy: 'category',
    pieBy: 'channel'
  });
};

onMounted(async () => {
  await loadAnalytics();
});

const onTopClick = (params: { name?: string }) => {
  router.push({
    path: `/app/datasets/${datasetId.value}/explore`,
    query: {
      ...buildFilters(),
      category: params.name ?? filterForm.category,
      page: '1',
      pageSize: '10'
    }
  });
};

const applyDrawerFilters = async () => {
  await loadAnalytics();
  filterDrawerVisible.value = false;
};

const resetFilters = async () => {
  dateRange.value = null;
  filterForm.category = '';
  filterForm.region = '';
  filterForm.channel = '';
  await loadAnalytics();
};

const formatAmount = (value: number) => amountFormatter.format(value);
const formatCount = (value: number) => countFormatter.format(value);
const formatPercent = (value: number) => percentFormatter.format(value);
</script>

<style scoped>
.mobile-filter-button {
  display: none;
}

.filter-card :deep(.el-form-item:last-child) {
  margin-bottom: var(--space-1);
}

.filter-drawer-form {
  padding-top: var(--space-2);
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

@media (max-width: 767px) {
  .mobile-filter-button {
    display: inline-flex;
  }

  .filter-card--desktop {
    display: none;
  }

  .drawer-actions {
    width: 100%;
  }

  .drawer-actions :deep(.el-button) {
    flex: 1;
  }
}
</style>
