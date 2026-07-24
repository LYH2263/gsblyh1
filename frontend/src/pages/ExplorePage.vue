<template>
  <div class="page-shell">
    <SectionCard>
      <PageHeaderBar title="明细与下钻" description="查看明细记录，并支持带筛选条件导出当前结果。">
        <template #actions>
          <div class="actions-group">
            <el-button @click="exportCsv">导出 CSV</el-button>
            <el-button type="primary" @click="goDashboard">返回仪表盘</el-button>
          </div>
        </template>
      </PageHeaderBar>

      <el-form :inline="true" :model="filters" class="filter-toolbar explore-filter">
        <el-form-item label="分类">
          <el-input v-model="filters.category" placeholder="可选" />
        </el-form-item>
        <el-form-item label="地区">
          <el-input v-model="filters.region" placeholder="可选" />
        </el-form-item>
        <el-form-item label="渠道">
          <el-input v-model="filters.channel" placeholder="可选" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="applyFilters">筛选</el-button>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="issueRecordIds.size > 0"
        class="issue-hint"
        type="warning"
        :closable="false"
        show-icon
      >
        最新巡检报告中仍有 {{ issueRecordIds.size }} 条问题记录，下表中的问题行已标记。
        <el-link type="primary" :underline="false" @click="goInspection">前往修复</el-link>
      </el-alert>

      <el-table
        class="explore-table"
        :data="recordStore.records"
        v-loading="recordStore.loading"
        border
        :row-class-name="rowClassName"
      >
        <el-table-column label="" width="60">
          <template #default="{ row }">
            <el-tooltip v-if="issueRecordIds.has(row.id)" content="该记录存在数据质量问题" placement="top">
              <el-tag type="warning" size="small" effect="dark">!</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="date" label="日期" width="132" />
        <el-table-column prop="category" label="分类" min-width="120" />
        <el-table-column prop="region" label="地区" min-width="120" />
        <el-table-column prop="channel" label="渠道" min-width="120" />
        <el-table-column prop="amount" label="金额" min-width="120" />
      </el-table>

      <div class="table-toolbar">
        <el-pagination
          background
          layout="prev, pager, next, sizes, total"
          :current-page="recordStore.filters.page"
          :page-size="recordStore.filters.pageSize"
          :total="recordStore.total"
          :page-sizes="[10, 20, 50]"
          @current-change="onPageChange"
          @size-change="onSizeChange"
        />
      </div>
    </SectionCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeaderBar from '@/components/ui/PageHeaderBar.vue';
import SectionCard from '@/components/ui/SectionCard.vue';
import { useRecordStore } from '@/stores/records';
import { inspectionsApi } from '@/api/inspections';
import type { RecordItem } from '@/types/models';

const route = useRoute();
const router = useRouter();
const recordStore = useRecordStore();

const datasetId = computed(() => Number(route.params.id));

const issueRecordIds = ref<Set<number>>(new Set());

const rowClassName = ({ row }: { row: RecordItem }) =>
  issueRecordIds.value.has(row.id) ? 'issue-row' : '';

const loadIssueMarks = async () => {
  if (!datasetId.value) {
    return;
  }
  try {
    const report = await inspectionsApi.getLatestReport(datasetId.value);
    issueRecordIds.value = new Set(report?.issueRecordIds ?? []);
  } catch {
    issueRecordIds.value = new Set();
  }
};

const goInspection = () => {
  router.push(`/app/datasets/${datasetId.value}/inspection`);
};

const filters = reactive({
  from: (route.query.from as string) || '',
  to: (route.query.to as string) || '',
  category: (route.query.category as string) || '',
  region: (route.query.region as string) || '',
  channel: (route.query.channel as string) || ''
});

const load = async (page = 1, pageSize = recordStore.filters.pageSize) => {
  if (!datasetId.value) {
    return;
  }

  await recordStore.fetchRecords(datasetId.value, {
    from: filters.from || undefined,
    to: filters.to || undefined,
    category: filters.category || undefined,
    region: filters.region || undefined,
    channel: filters.channel || undefined,
    page,
    pageSize
  });
};

onMounted(async () => {
  await Promise.all([
    load(Number(route.query.page ?? 1), Number(route.query.pageSize ?? 10)),
    loadIssueMarks()
  ]);
});

const applyFilters = async () => {
  await load(1);
  router.replace({
    path: `/app/datasets/${datasetId.value}/explore`,
    query: {
      ...filters,
      page: '1',
      pageSize: String(recordStore.filters.pageSize)
    }
  });
};

const onPageChange = async (page: number) => {
  await load(page);
};

const onSizeChange = async (pageSize: number) => {
  await load(1, pageSize);
};

const exportCsv = () => {
  const header = 'date,category,amount,region,channel';
  const rows = recordStore.records.map((item) =>
    [item.date, item.category, item.amount, item.region, item.channel].join(',')
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dataset-${datasetId.value}-records.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const goDashboard = () => {
  router.push(`/app/datasets/${datasetId.value}/dashboard`);
};
</script>

<style scoped>
.explore-filter,
.explore-table {
  margin-top: var(--space-4);
}

.issue-hint {
  margin-top: var(--space-4);
}

.explore-table :deep(.issue-row) {
  background: color-mix(in srgb, #f59e0b 12%, var(--surface-card));
}
</style>
