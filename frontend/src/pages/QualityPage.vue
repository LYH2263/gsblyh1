<template>
  <div class="page-shell quality-page">
    <PageHeaderBar
      title="数据质量巡检与修复"
      description="发起巡检、查看质量报告、按规则筛选问题，修复后一键复检。"
    >
      <template #actions>
        <div class="actions-group">
          <el-select
            v-model="currentDatasetId"
            class="dataset-select"
            placeholder="选择数据集"
            :loading="datasetStore.loading"
            @change="onDatasetChange"
          >
            <el-option
              v-for="ds in datasetStore.datasets"
              :key="ds.id"
              :label="ds.name"
              :value="ds.id"
            />
          </el-select>
          <el-button
            type="primary"
            :loading="qualityStore.loading || qualityStore.polling"
            :disabled="!currentDatasetId"
            @click="startOrReInspect"
          >
            {{ qualityStore.hasReport ? '重新巡检' : '发起巡检' }}
          </el-button>
        </div>
      </template>
    </PageHeaderBar>

    <SectionCard v-if="!currentDatasetId" class="empty-card">
      <el-empty description="暂无数据集，请先在「数据集」中创建数据集并导入数据。" />
    </SectionCard>

    <template v-else>
      <SectionCard v-if="showProgress" title="巡检进度" class="progress-card">
        <div class="progress-inner">
          <el-progress
            :percentage="progressPercent"
            :status="progressStatus"
            :stroke-width="14"
          />
          <p class="progress-hint">{{ progressText }}</p>
        </div>
      </SectionCard>

      <SectionCard v-if="qualityStore.isFailed" class="error-card">
        <el-result
          icon="error"
          title="巡检失败"
          :sub-title="qualityStore.error || '任务执行过程中发生错误'"
        >
          <template #extra>
            <el-button type="primary" @click="startOrReInspect">重试巡检</el-button>
          </template>
        </el-result>
      </SectionCard>

      <SectionCard
        v-if="qualityStore.hasReport && qualityStore.report"
        title="质量报告"
        class="report-card"
      >
        <div class="report-overview">
          <div class="score-block">
            <div class="score-ring" :style="{ color: scoreColor }">
              <span class="score-value">{{ qualityStore.report.score }}</span>
              <span class="score-unit">/100</span>
            </div>
            <div class="score-meta">
              <p class="score-label">质量分</p>
              <el-tag :color="scoreColor" effect="dark" round size="small">
                {{ scoreLabel }}
              </el-tag>
              <p class="score-created">
                生成于 {{ formatTime(qualityStore.report.createdAt) }}
              </p>
            </div>
          </div>

          <div class="report-kpi">
            <div class="kpi-mini">
              <span class="kpi-mini-value">{{ qualityStore.report.totalRecords }}</span>
              <span class="kpi-mini-label">总记录数</span>
            </div>
            <div class="kpi-mini">
              <span class="kpi-mini-value kpi-mini-value--danger">{{ qualityStore.totalIssues }}</span>
              <span class="kpi-mini-label">问题项总数</span>
            </div>
          </div>
        </div>

        <div v-if="qualityStore.report.totalRecords === 0" class="report-empty">
          <el-empty description="该数据集暂无记录，无法进行质量分析。请先导入数据后再发起巡检。" />
        </div>

        <div v-else-if="qualityStore.totalIssues === 0" class="report-empty">
          <el-result icon="success" title="未发现质量问题" sub-title="数据集通过全部规则校验。" />
        </div>
      </SectionCard>

      <SectionCard
        v-if="qualityStore.hasReport && qualityStore.report && qualityStore.totalIssues > 0"
        title="问题分类统计"
        class="stats-card"
      >
        <div class="category-grid">
          <button
            v-for="meta in ruleMetas"
            :key="meta.key"
            class="category-chip"
            :class="{ 'category-chip--active': qualityStore.ruleFilter === meta.key }"
            :style="{
              borderColor: meta.color,
              background:
                qualityStore.ruleFilter === meta.key
                  ? meta.bgColor
                  : 'var(--surface-card)'
            }"
            @click="filterByRule(meta.key)"
          >
            <span class="category-dot" :style="{ background: meta.color }" />
            <span class="category-label" :style="{ color: meta.color }">{{ meta.label }}</span>
            <span class="category-count">{{ categoryCounts[meta.key] }}</span>
          </button>
          <button
            class="category-chip"
            :class="{ 'category-chip--active': qualityStore.ruleFilter === 'all' }"
            @click="filterByRule('all')"
          >
            <span class="category-dot category-dot--all" />
            <span class="category-label">全部</span>
            <span class="category-count">{{ qualityStore.totalIssues }}</span>
          </button>
        </div>
        <p v-if="activeRuleMeta" class="category-description">
          {{ activeRuleMeta.description }} · {{ activeRuleMeta.repairHint }}
        </p>
      </SectionCard>

      <SectionCard
        v-if="qualityStore.hasReport && qualityStore.report && qualityStore.totalIssues > 0"
        title="问题明细"
        class="issues-card"
      >
        <template #actions>
          <div class="actions-group">
            <el-radio-group
              v-model="statusFilterLocal"
              size="small"
              @change="onStatusFilterChange"
            >
              <el-radio-button value="open">未修复</el-radio-button>
              <el-radio-button value="fixed">已修复</el-radio-button>
              <el-radio-button value="all">全部</el-radio-button>
            </el-radio-group>
            <el-button
              v-if="canBatchRepairMissing"
              size="small"
              :loading="qualityStore.repairing"
              @click="batchRepairMissing"
            >
              一键填充缺失默认值
            </el-button>
            <el-button
              v-if="canBatchRepairAmount"
              size="small"
              :loading="qualityStore.repairing"
              @click="batchRepairAmount"
            >
              一键金额取绝对值
            </el-button>
            <el-button
              v-if="canDeleteDuplicates"
              size="small"
              type="danger"
              :loading="qualityStore.repairing"
              @click="confirmDeleteDuplicates"
            >
              删除选中重复 ({{ qualityStore.selectedIssueIds.length }})
            </el-button>
          </div>
        </template>

        <el-table
          class="issues-table"
          :data="qualityStore.issues"
          v-loading="qualityStore.issuesLoading"
          border
          row-key="id"
          @selection-change="onSelectionChange"
        >
          <el-table-column
            v-if="showCheckbox"
            type="selection"
            width="44"
            :selectable="isSelectable"
          />
          <el-table-column prop="id" label="问题ID" width="88" />
          <el-table-column label="规则" width="120">
            <template #default="{ row }">
              <el-tag
                :color="getRuleMeta(row.rule).bgColor"
                :style="{ color: getRuleMeta(row.rule).color }"
                effect="plain"
                round
                size="small"
              >
                {{ getRuleMeta(row.rule).short }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="recordId" label="记录ID" width="88" />
          <el-table-column label="字段" width="92">
            <template #default="{ row }">
              {{ row.field || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="summary" label="问题摘要" min-width="260" />
          <el-table-column label="状态" width="88">
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'fixed' ? 'success' : 'warning'"
                size="small"
                round
              >
                {{ row.status === 'fixed' ? '已修复' : '待修复' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button
                  v-if="row.rule === 'missing_field' && row.status === 'open'"
                  link
                  type="primary"
                  size="small"
                  @click="repairMissing(row)"
                >
                  填默认值
                </el-button>
                <el-button
                  v-if="row.rule === 'abnormal_amount' && row.status === 'open'"
                  link
                  type="primary"
                  size="small"
                  @click="repairAmount(row)"
                >
                  取绝对值
                </el-button>
                <el-button
                  v-if="row.rule === 'duplicate_key' && row.status === 'open'"
                  link
                  type="danger"
                  size="small"
                  @click="deleteSingleDuplicate(row)"
                >
                  删除
                </el-button>
                <el-button
                  v-if="row.rule === 'future_date' && row.status === 'open'"
                  link
                  type="info"
                  size="small"
                  disabled
                >
                  需手动
                </el-button>
                <span v-if="row.status === 'fixed'" class="text-muted">—</span>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div class="table-toolbar">
          <el-pagination
            background
            layout="prev, pager, next, sizes, total"
            :current-page="qualityStore.issuesPage"
            :page-size="qualityStore.issuesPageSize"
            :total="qualityStore.issuesTotal"
            :page-sizes="[10, 20, 50]"
            @current-change="onPageChange"
            @size-change="onSizeChange"
          />
        </div>
      </SectionCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import PageHeaderBar from '@/components/ui/PageHeaderBar.vue';
import SectionCard from '@/components/ui/SectionCard.vue';
import { useDatasetStore } from '@/stores/datasets';
import { useQualityStore } from '@/stores/quality';
import { RULE_META, RULE_ORDER, scoreLevel } from '@/config/qualityRules';
import type { QualityIssue, QualityRule } from '@/types/models';

const route = useRoute();
const router = useRouter();
const datasetStore = useDatasetStore();
const qualityStore = useQualityStore();

const ruleMetas = computed(() => RULE_ORDER.map((key) => RULE_META[key]));

const currentDatasetId = ref<number>(0);
const statusFilterLocal = ref<'open' | 'fixed' | 'all'>('open');

const getRuleMeta = (rule: QualityRule) => RULE_META[rule];

onMounted(async () => {
  if (!datasetStore.datasets.length) {
    await datasetStore.fetchDatasets();
  }
  const idFromRoute = Number(route.params.id);
  if (idFromRoute) {
    currentDatasetId.value = idFromRoute;
    if (datasetStore.datasets.some((d) => d.id === idFromRoute)) {
      await qualityStore.loadLatestReport(idFromRoute);
    } else {
      currentDatasetId.value = datasetStore.datasets[0]?.id ?? 0;
      if (currentDatasetId.value) {
        router.replace(`/app/datasets/${currentDatasetId.value}/quality`);
        await qualityStore.loadLatestReport(currentDatasetId.value);
      }
    }
  } else if (datasetStore.currentDatasetId) {
    currentDatasetId.value = datasetStore.currentDatasetId;
    router.replace(`/app/datasets/${currentDatasetId.value}/quality`);
    await qualityStore.loadLatestReport(currentDatasetId.value);
  } else if (datasetStore.datasets.length > 0) {
    currentDatasetId.value = datasetStore.datasets[0].id;
    router.replace(`/app/datasets/${currentDatasetId.value}/quality`);
    await qualityStore.loadLatestReport(currentDatasetId.value);
  }
});

watch(
  () => route.params.id,
  async (newId) => {
    const id = Number(newId);
    if (id && id !== currentDatasetId.value) {
      currentDatasetId.value = id;
      qualityStore.resetState();
      await qualityStore.loadLatestReport(id);
    }
  }
);

const onDatasetChange = async (id: number) => {
  currentDatasetId.value = id;
  router.push(`/app/datasets/${id}/quality`);
  qualityStore.resetState();
  await qualityStore.loadLatestReport(id);
};

const startOrReInspect = async () => {
  if (!currentDatasetId.value) {
    return;
  }
  statusFilterLocal.value = 'open';
  qualityStore.statusFilter = 'open';
  await qualityStore.startInspection(currentDatasetId.value);
  if (qualityStore.isDone) {
    ElMessage.success('巡检完成');
  }
};

const progressPercent = computed(() => {
  if (!qualityStore.task) {
    return 0;
  }
  if (qualityStore.task.status === 'queued') {
    return 15;
  }
  if (qualityStore.task.status === 'running') {
    return 60;
  }
  if (qualityStore.task.status === 'done') {
    return 100;
  }
  return 100;
});

const progressStatus = computed<'' | 'success' | 'exception' | 'warning'>(() => {
  if (qualityStore.task?.status === 'done') {
    return 'success';
  }
  if (qualityStore.task?.status === 'failed') {
    return 'exception';
  }
  return '';
});

const progressText = computed(() => {
  if (!qualityStore.task) {
    return '准备中…';
  }
  switch (qualityStore.task.status) {
    case 'queued':
      return '任务已提交，排队中…';
    case 'running':
      return '正在执行质量规则巡检…';
    case 'done':
      return '巡检完成，报告已生成。';
    case 'failed':
      return `巡检失败：${qualityStore.task.error || '未知错误'}`;
    default:
      return '';
  }
});

const showProgress = computed(
  () =>
    qualityStore.polling ||
    qualityStore.isRunning ||
    (qualityStore.task !== null && !qualityStore.hasReport && !qualityStore.isFailed)
);

const scoreColor = computed(() => {
  if (!qualityStore.report) {
    return '#94a3b8';
  }
  return scoreLevel(qualityStore.report.score).color;
});

const scoreLabel = computed(() => {
  if (!qualityStore.report) {
    return '';
  }
  return scoreLevel(qualityStore.report.score).label;
});

const categoryCounts = computed<Record<QualityRule, number>>(() => ({
  missing_field: qualityStore.categoryStats.missing,
  abnormal_amount: qualityStore.categoryStats.abnormalAmount,
  future_date: qualityStore.categoryStats.futureDate,
  duplicate_key: qualityStore.categoryStats.duplicate
}));

const activeRuleMeta = computed(() => {
  if (qualityStore.ruleFilter === 'all') {
    return null;
  }
  return RULE_META[qualityStore.ruleFilter];
});

const filterByRule = async (rule: QualityRule | 'all') => {
  await qualityStore.changeRuleFilter(rule);
};

const onStatusFilterChange = async (val: 'open' | 'fixed' | 'all') => {
  await qualityStore.changeStatusFilter(val);
};

const onPageChange = async (page: number) => {
  await qualityStore.changePage(page);
};

const onSizeChange = async (size: number) => {
  await qualityStore.changePageSize(size);
};

const showCheckbox = computed(
  () => qualityStore.ruleFilter === 'duplicate_key' || qualityStore.ruleFilter === 'all'
);

const isSelectable = (row: QualityIssue) =>
  row.rule === 'duplicate_key' && row.status === 'open';

const onSelectionChange = (selection: QualityIssue[]) => {
  const currentPageIds = qualityStore.issues.map((i) => i.id);
  const selectedDupIds = selection
    .filter((i) => i.rule === 'duplicate_key' && i.status === 'open')
    .map((i) => i.id);
  const retained = qualityStore.selectedIssueIds.filter((id) => !currentPageIds.includes(id));
  qualityStore.selectedIssueIds = [...new Set([...retained, ...selectedDupIds])];
};

const canBatchRepairMissing = computed(
  () =>
    (qualityStore.ruleFilter === 'all' || qualityStore.ruleFilter === 'missing_field') &&
    (qualityStore.statusFilter === 'open' || qualityStore.statusFilter === 'all') &&
    categoryCounts.value.missing_field > 0
);

const canBatchRepairAmount = computed(
  () =>
    (qualityStore.ruleFilter === 'all' || qualityStore.ruleFilter === 'abnormal_amount') &&
    (qualityStore.statusFilter === 'open' || qualityStore.statusFilter === 'all') &&
    categoryCounts.value.abnormal_amount > 0
);

const canDeleteDuplicates = computed(
  () =>
    (qualityStore.ruleFilter === 'all' || qualityStore.ruleFilter === 'duplicate_key') &&
    qualityStore.selectedIssueIds.length > 0
);

const repairMissing = async (issue: QualityIssue) => {
  let defaultValue: string | undefined;
  if (issue.field === 'category') {
    defaultValue = '未分类';
  } else if (issue.field === 'region') {
    defaultValue = '未知地区';
  } else if (issue.field === 'channel') {
    defaultValue = '未知渠道';
  }
  await qualityStore.repairMissing(issue.id, defaultValue);
  ElMessage.success(`已为记录 #${issue.recordId} 填充默认值`);
};

const repairAmount = async (issue: QualityIssue) => {
  await qualityStore.repairAbnormalAmount(issue.id);
  ElMessage.success(`记录 #${issue.recordId} 金额已取绝对值`);
};

const deleteSingleDuplicate = async (issue: QualityIssue) => {
  try {
    await ElMessageBox.confirm(
      `确认删除重复记录 #${issue.recordId}？此操作不可恢复。`,
      '删除重复记录',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
  } catch {
    return;
  }
  qualityStore.selectedIssueIds = [issue.id];
  const count = await qualityStore.deleteSelectedDuplicates();
  if (count > 0) {
    ElMessage.success(`已删除 ${count} 条重复记录`);
  }
};

const batchRepairMissing = async () => {
  try {
    await ElMessageBox.confirm(
      '将对当前报告中所有「字段缺失」问题填充默认值，是否继续？',
      '批量填充默认值',
      { confirmButtonText: '继续', cancelButtonText: '取消', type: 'info' }
    );
  } catch {
    return;
  }
  await qualityStore.batchRepairMissing();
  ElMessage.success('缺失字段已批量填充默认值');
};

const batchRepairAmount = async () => {
  try {
    await ElMessageBox.confirm(
      '将对当前报告中所有「异常金额（负值）」取绝对值，是否继续？',
      '批量修复异常金额',
      { confirmButtonText: '继续', cancelButtonText: '取消', type: 'info' }
    );
  } catch {
    return;
  }
  await qualityStore.batchRepairAbnormalAmount();
  ElMessage.success('异常金额已批量取绝对值');
};

const confirmDeleteDuplicates = async () => {
  const count = qualityStore.selectedIssueIds.length;
  try {
    await ElMessageBox.confirm(
      `即将删除选中的 ${count} 条重复记录，此操作不可恢复。请再次确认。`,
      '批量删除重复记录',
      {
        confirmButtonText: `确认删除 ${count} 条`,
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
  } catch {
    return;
  }
  const fixed = await qualityStore.deleteSelectedDuplicates();
  ElMessage.success(`已删除 ${fixed} 条重复记录，请点击「重新巡检」查看最新质量分`);
};

const formatTime = (iso: string): string => {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
};
</script>

<style scoped>
.dataset-select {
  width: 220px;
}

.progress-card,
.report-card,
.stats-card,
.issues-card,
.error-card,
.empty-card {
  margin-top: 0;
}

.progress-inner {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.progress-hint {
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.report-overview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.score-block {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.score-ring {
  width: 108px;
  height: 108px;
  border-radius: 50%;
  border: 6px solid currentColor;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  background: color-mix(in srgb, currentColor 6%, var(--surface-card));
}

.score-value {
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
}

.score-unit {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

.score-meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.score-label {
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.score-created {
  color: var(--text-tertiary);
  font-size: var(--text-xs);
}

.report-kpi {
  display: flex;
  gap: var(--space-4);
}

.kpi-mini {
  min-width: 120px;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-default);
  background: var(--surface-muted);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.kpi-mini-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.kpi-mini-value--danger {
  color: var(--state-danger);
}

.kpi-mini-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.report-empty {
  margin-top: var(--space-4);
}

.category-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: 999px;
  border: 1px solid var(--border-default);
  background: var(--surface-card);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  font-size: var(--text-sm);
}

.category-chip:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.category-chip--active {
  font-weight: var(--font-weight-semibold);
}

.category-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.category-dot--all {
  background: var(--text-tertiary);
}

.category-label {
  color: var(--text-primary);
}

.category-count {
  min-width: 24px;
  padding: 0 8px;
  height: 20px;
  line-height: 20px;
  border-radius: 999px;
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.category-description {
  margin-top: var(--space-3);
  color: var(--text-tertiary);
  font-size: var(--text-xs);
}

.issues-table {
  margin-top: var(--space-3);
}

.row-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.text-muted {
  color: var(--text-tertiary);
  font-size: var(--text-xs);
}

@media (max-width: 767px) {
  .report-overview {
    flex-direction: column;
    align-items: flex-start;
  }

  .dataset-select {
    width: 100%;
  }

  .score-ring {
    width: 88px;
    height: 88px;
  }

  .score-value {
    font-size: 28px;
  }
}
</style>
