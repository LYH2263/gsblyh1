<template>
  <div class="page-shell">
    <SectionCard>
      <PageHeaderBar title="明细与下钻" description="查看明细记录，并支持带筛选条件导出当前结果。">
        <template #actions>
          <div class="actions-group">
            <el-button @click="exportCsv">导出 CSV</el-button>
            <el-button type="warning" @click="goQuality">质量巡检</el-button>
            <el-button type="primary" @click="goDashboard">返回仪表盘</el-button>
          </div>
        </template>
      </PageHeaderBar>

      <el-alert
        v-if="qualityStore.flaggedRecordIds.length > 0"
        type="warning"
        :closable="false"
        class="quality-alert"
      >
        最新巡检报告中，当前页有 {{ flaggedCountOnPage }} 条记录存在质量问题，已用
        <el-tag type="warning" size="small" style="margin: 0 4px">⚠ 质量问题</el-tag>
        标记。
        <el-button link type="primary" @click="goQuality">前往巡检页修复</el-button>
      </el-alert>

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

      <el-table class="explore-table" :data="recordStore.records" v-loading="recordStore.loading" border>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="isFlagged(row.id)" type="warning" size="small" effect="dark">
              ⚠ 质量问题
            </el-tag>
            <span v-else class="text-ok">✓ 正常</span>
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
import { computed, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeaderBar from '@/components/ui/PageHeaderBar.vue';
import SectionCard from '@/components/ui/SectionCard.vue';
import { useRecordStore } from '@/stores/records';
import { useQualityStore } from '@/stores/quality';

const route = useRoute();
const router = useRouter();
const recordStore = useRecordStore();
const qualityStore = useQualityStore();

const datasetId = computed(() => Number(route.params.id));

const flaggedIdSet = computed(() => new Set(qualityStore.flaggedRecordIds));

const flaggedCountOnPage = computed(() => {
  return recordStore.records.filter((r) => flaggedIdSet.value.has(r.id)).length;
});

const isFlagged = (recordId: number): boolean => {
  return flaggedIdSet.value.has(recordId);
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
  if (datasetId.value) {
    await qualityStore.fetchFlaggedRecords(datasetId.value);
  }
  await load(Number(route.query.page ?? 1), Number(route.query.pageSize ?? 10));
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

const goQuality = () => {
  router.push(`/app/datasets/${datasetId.value}/quality`);
};
</script>

<style scoped>
.explore-filter,
.explore-table {
  margin-top: var(--space-4);
}

.quality-alert {
  margin-top: var(--space-4);
}

.text-ok {
  color: var(--state-success);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
}
</style>
