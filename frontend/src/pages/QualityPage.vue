<template>
  <div class="page-shell quality-page">
    <SectionCard>
      <PageHeaderBar
        title="数据质量巡检"
        description="对数据集执行质量巡检，发现字段缺失、异常金额、未来日期、重复组合键等问题，支持一键修复与复检。"
      >
        <template #actions>
          <div class="actions-group">
            <el-button @click="goExplore">数据探索</el-button>
            <el-button type="primary" @click="goDashboard">返回仪表盘</el-button>
          </div>
        </template>
      </PageHeaderBar>

      <div class="dataset-selector-row">
        <span class="selector-label">当前数据集：</span>
        <el-select
          v-model="selectedDatasetId"
          placeholder="选择数据集"
          style="width: 240px"
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
          :loading="qualityStore.loading || qualityStore.isRunning"
          :disabled="!selectedDatasetId"
          @click="startInspection"
        >
          {{ qualityStore.isRunning ? '巡检中…' : qualityStore.currentReport ? '重新巡检' : '发起巡检' }}
        </el-button>
      </div>
    </SectionCard>

    <template v-if="!selectedDatasetId">
      <SectionCard>
        <div class="empty-state">
          <el-empty description="请先从数据集管理页创建数据集并导入数据" />
        </div>
      </SectionCard>
    </template>

    <template v-else-if="qualityStore.loading && !qualityStore.currentTask">
      <SectionCard>
        <div class="empty-state">
          <el-skeleton :rows="4" animated />
        </div>
      </SectionCard>
    </template>

    <template v-else-if="qualityStore.taskStatus === 'queued' || qualityStore.taskStatus === 'running'">
      <SectionCard>
        <div class="progress-state">
          <el-progress
            type="circle"
            :percentage="progressPercent"
            :status="progressStatus"
            :width="120"
          />
          <div class="progress-info">
            <h3 class="progress-title">
              {{ qualityStore.taskStatus === 'queued' ? '任务排队中…' : '正在执行巡检…' }}
            </h3>
            <p class="progress-desc">
              任务 #{{ qualityStore.currentTask?.id }} 正在扫描数据，请稍候。
            </p>
          </div>
        </div>
      </SectionCard>
    </template>

    <template v-else-if="qualityStore.taskStatus === 'failed'">
      <SectionCard>
        <div class="empty-state error-state">
          <el-result
            icon="error"
            title="巡检执行失败"
            :sub-title="qualityStore.currentTask?.errorMessage || '未知错误'"
          >
            <template #extra>
              <el-button type="primary" @click="startInspection">重试</el-button>
            </template>
          </el-result>
        </div>
      </SectionCard>
    </template>

    <template v-else-if="qualityStore.currentReport">
      <div class="score-section">
        <div class="score-card">
          <div class="score-ring-wrap">
            <el-progress
              type="circle"
              :percentage="qualityStore.currentReport.qualityScore"
              :color="scoreColor"
              :width="120"
              :stroke-width="10"
            />
          </div>
          <div class="score-info">
            <p class="score-label">质量评分</p>
            <p class="score-meta">
              共 {{ qualityStore.currentReport.totalRecords }} 条记录，
              {{ totalIssuesCount }} 个问题
            </p>
            <p class="score-time">
              巡检时间：{{ formatTime(qualityStore.currentReport.createdAt) }}
            </p>
          </div>
        </div>

        <div class="stats-grid">
          <div
            v-for="stat in issueStats"
            :key="stat.rule"
            class="stat-card"
            :class="{ 'stat-card--active': qualityStore.issuesRuleFilter === stat.rule }"
            @click="filterByRule(stat.rule)"
          >
            <div class="stat-icon" :style="{ background: stat.bgColor, color: stat.color }">
              {{ stat.symbol }}
            </div>
            <div class="stat-body">
              <p class="stat-value">{{ stat.count }}</p>
              <p class="stat-name">{{ stat.label }}</p>
            </div>
          </div>
        </div>
      </div>

      <SectionCard v-if="qualityStore.issuesTotal > 0 || qualityStore.issuesRuleFilter">
        <div class="issues-toolbar">
          <div class="filter-group">
            <el-button
              :type="qualityStore.issuesRuleFilter === '' ? 'primary' : 'default'"
              size="small"
              @click="filterByRule('')"
            >
              全部 ({{ totalIssuesCount }})
            </el-button>
            <el-button
              v-for="stat in issueStats"
              :key="stat.rule"
              :type="qualityStore.issuesRuleFilter === stat.rule ? 'primary' : 'default'"
              size="small"
              @click="filterByRule(stat.rule)"
            >
              {{ stat.label }} ({{ stat.count }})
            </el-button>
          </div>

          <div class="batch-actions" v-if="selectedIssueIds.length > 0">
            <span class="selected-count">已选 {{ selectedIssueIds.length }} 条</span>
            <el-button
              size="small"
              type="warning"
              :disabled="!canFixMissing"
              @click="confirmFixMissing"
            >
              填充默认值
            </el-button>
            <el-button
              size="small"
              type="warning"
              :disabled="!canFixAmounts"
              @click="confirmFixAmounts"
            >
              修正金额
            </el-button>
            <el-button
              size="small"
              type="danger"
              :disabled="!canFixDuplicates"
              @click="confirmFixDuplicates"
            >
              删除重复
            </el-button>
          </div>
        </div>

        <el-table
          class="issues-table"
          :data="qualityStore.issues"
          v-loading="qualityStore.loading"
          border
          @selection-change="onSelectionChange"
        >
          <el-table-column type="selection" width="48" />
          <el-table-column prop="recordId" label="记录ID" width="90" />
          <el-table-column label="问题类型" width="130">
            <template #default="{ row }">
              <el-tag :type="ruleTagType(row.rule)" size="small">
                {{ ruleLabel(row.rule) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="field" label="字段" width="120">
            <template #default="{ row }">
              <span v-if="row.field">{{ row.field }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column prop="summary" label="问题描述" min-width="280" />
          <el-table-column label="修复方式" width="180">
            <template #default="{ row }">
              <el-tag size="small" type="info" effect="plain">
                {{ fixMethodLabel(row.rule) }}
              </el-tag>
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

      <SectionCard v-else>
        <div class="empty-state">
          <el-result
            icon="success"
            title="数据质量良好"
            sub-title="未发现任何数据质量问题，可以放心使用。"
          />
        </div>
      </SectionCard>

      <div class="reinspect-bar">
        <el-button
          type="primary"
          size="large"
          :loading="qualityStore.loading || qualityStore.isRunning"
          @click="startInspection"
        >
          {{ qualityStore.isRunning ? '复检中…' : '修复后复检' }}
        </el-button>
      </div>
    </template>

    <template v-else>
      <SectionCard>
        <div class="empty-state">
          <el-result
            icon="info"
            title="尚未执行巡检"
            sub-title="点击上方「发起巡检」按钮，对当前数据集执行四类质量规则检测。"
          >
            <template #extra>
              <el-button type="primary" @click="startInspection">发起巡检</el-button>
            </template>
          </el-result>
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
import type { IssueRule, QualityIssue } from '@/types/models';

const route = useRoute();
const router = useRouter();
const datasetStore = useDatasetStore();
const qualityStore = useQualityStore();

const selectedDatasetId = ref<number | null>(null);
const selectedIssueIds = ref<number[]>([]);

const currentTaskId = computed(() => qualityStore.currentTask?.id ?? null);

const totalIssuesCount = computed(() => {
  if (!qualityStore.currentReport) return 0;
  const c = qualityStore.currentReport.issueCounts;
  return c.missing + c.abnormalAmount + c.futureDate + c.duplicate;
});

const issueStats = computed(() => {
  const c = qualityStore.currentReport?.issueCounts ?? {
    missing: 0,
    abnormalAmount: 0,
    futureDate: 0,
    duplicate: 0
  };
  return [
    {
      rule: 'missing' as IssueRule,
      label: '字段缺失',
      count: c.missing,
      symbol: '!',
      color: '#d97706',
      bgColor: '#fef3c7'
    },
    {
      rule: 'abnormal_amount' as IssueRule,
      label: '异常金额',
      count: c.abnormalAmount,
      symbol: '¥',
      color: '#dc2626',
      bgColor: '#fee2e2'
    },
    {
      rule: 'future_date' as IssueRule,
      label: '未来日期',
      count: c.futureDate,
      symbol: '⏱',
      color: '#0284c7',
      bgColor: '#e0f2fe'
    },
    {
      rule: 'duplicate' as IssueRule,
      label: '重复记录',
      count: c.duplicate,
      symbol: '⧉',
      color: '#7c3aed',
      bgColor: '#ede9fe'
    }
  ];
});

const scoreColor = computed(() => {
  const s = qualityStore.currentReport?.qualityScore ?? 0;
  if (s >= 80) return '#16a34a';
  if (s >= 60) return '#d97706';
  return '#dc2626';
});

const progressPercent = computed(() => {
  if (qualityStore.taskStatus === 'queued') return 25;
  if (qualityStore.taskStatus === 'running') return 65;
  return 0;
});

const progressStatus = computed<'success' | 'warning' | 'exception' | ''>(() => {
  return qualityStore.taskStatus === 'failed' ? 'exception' : '';
});

const selectedIssues = computed<QualityIssue[]>(() => {
  if (!qualityStore.currentReport) return [];
  return qualityStore.issues.filter((i) => selectedIssueIds.value.includes(i.recordId));
});

const canFixMissing = computed(() => {
  return selectedIssues.value.some((i) => i.rule === 'missing');
});

const canFixAmounts = computed(() => {
  return selectedIssues.value.some((i) => i.rule === 'abnormal_amount');
});

const canFixDuplicates = computed(() => {
  return selectedIssues.value.every((i) => i.rule === 'duplicate');
});

const ruleLabel = (rule: IssueRule): string => {
  const map: Record<IssueRule, string> = {
    missing: '字段缺失',
    abnormal_amount: '异常金额',
    future_date: '未来日期',
    duplicate: '重复记录'
  };
  return map[rule];
};

const ruleTagType = (rule: IssueRule): 'warning' | 'danger' | 'info' | '' => {
  const map: Record<IssueRule, 'warning' | 'danger' | 'info' | ''> = {
    missing: 'warning',
    abnormal_amount: 'danger',
    future_date: 'info',
    duplicate: ''
  };
  return map[rule];
};

const fixMethodLabel = (rule: IssueRule): string => {
  const map: Record<IssueRule, string> = {
    missing: '填充默认值',
    abnormal_amount: '取绝对值/上限',
    future_date: '需人工修正',
    duplicate: '批量删除'
  };
  return map[rule];
};

const formatTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('zh-CN');
  } catch {
    return iso;
  }
};

const onDatasetChange = async () => {
  qualityStore.resetTaskState();
  selectedIssueIds.value = [];
  if (selectedDatasetId.value) {
    await qualityStore.fetchLatestReport(selectedDatasetId.value);
  }
};

const startInspection = async () => {
  if (!selectedDatasetId.value) return;
  selectedIssueIds.value = [];
  try {
    await qualityStore.startInspection(selectedDatasetId.value);
    if (qualityStore.taskStatus === 'done' && qualityStore.currentReport) {
      ElMessage.success(
        `巡检完成，质量评分：${qualityStore.currentReport.qualityScore}分`
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '巡检启动失败';
    ElMessage.error(msg);
  }
};

const filterByRule = async (rule: IssueRule | '') => {
  if (!currentTaskId.value) return;
  selectedIssueIds.value = [];
  await qualityStore.changeRuleFilter(currentTaskId.value, rule);
};

const onSelectionChange = (selection: QualityIssue[]) => {
  selectedIssueIds.value = selection.map((s) => s.recordId);
};

const onPageChange = async (page: number) => {
  if (!currentTaskId.value) return;
  selectedIssueIds.value = [];
  await qualityStore.fetchIssues(currentTaskId.value, { page });
};

const onSizeChange = async (pageSize: number) => {
  if (!currentTaskId.value) return;
  selectedIssueIds.value = [];
  await qualityStore.fetchIssues(currentTaskId.value, { page: 1, pageSize });
};

const getSelectedIdsByRule = (rule: IssueRule): number[] => {
  return selectedIssues.value.filter((i) => i.rule === rule).map((i) => i.recordId);
};

const confirmFixMissing = async () => {
  if (!selectedDatasetId.value) return;
  const ids = getSelectedIdsByRule('missing');
  if (ids.length === 0) {
    ElMessage.warning('请先选择字段缺失的问题记录');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `将对选中的 ${ids.length} 条缺失记录填充默认值（分类→未分类，地区→未知地区，渠道→未知渠道，日期→1970-01-01），是否继续？`,
      '确认修复',
      { type: 'warning', confirmButtonText: '确认填充', cancelButtonText: '取消' }
    );
    const count = await qualityStore.fixMissing(selectedDatasetId.value, ids);
    ElMessage.success(`已修复 ${count} 条记录，请点击复检查看最新结果`);
    selectedIssueIds.value = [];
  } catch {
    // user cancelled
  }
};

const confirmFixAmounts = async () => {
  if (!selectedDatasetId.value) return;
  const ids = getSelectedIdsByRule('abnormal_amount');
  if (ids.length === 0) {
    ElMessage.warning('请先选择异常金额的问题记录');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `将对选中的 ${ids.length} 条异常金额记录取绝对值（负数转正，0→0.01，超上限→10000000），是否继续？`,
      '确认修复',
      { type: 'warning', confirmButtonText: '确认修正', cancelButtonText: '取消' }
    );
    const count = await qualityStore.fixAmounts(selectedDatasetId.value, ids);
    ElMessage.success(`已修复 ${count} 条记录，请点击复检查看最新结果`);
    selectedIssueIds.value = [];
  } catch {
    // user cancelled
  }
};

const confirmFixDuplicates = async () => {
  if (!selectedDatasetId.value) return;
  const ids = getSelectedIdsByRule('duplicate');
  if (ids.length === 0) {
    ElMessage.warning('请先选择重复记录');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `⚠️ 此操作将永久删除选中的 ${ids.length} 条重复记录，删除后不可恢复。是否继续？`,
      '危险操作确认',
      {
        type: 'error',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger'
      }
    );
    const count = await qualityStore.fixDuplicates(selectedDatasetId.value, ids);
    ElMessage.success(`已删除 ${count} 条重复记录，请点击复检查看最新结果`);
    selectedIssueIds.value = [];
  } catch {
    // user cancelled
  }
};

const goDashboard = () => {
  if (selectedDatasetId.value) {
    router.push(`/app/datasets/${selectedDatasetId.value}/dashboard`);
  } else {
    router.push('/app/datasets');
  }
};

const goExplore = () => {
  if (selectedDatasetId.value) {
    router.push(`/app/datasets/${selectedDatasetId.value}/explore`);
  } else {
    router.push('/app/datasets');
  }
};

onMounted(async () => {
  if (!datasetStore.datasets.length) {
    await datasetStore.fetchDatasets();
  }
  const idFromRoute = route.params.id ? Number(route.params.id) : null;
  selectedDatasetId.value = idFromRoute || datasetStore.currentDatasetId || datasetStore.datasets[0]?.id || null;

  if (selectedDatasetId.value) {
    await qualityStore.fetchLatestReport(selectedDatasetId.value);
  }
});

watch(
  () => route.params.id,
  async (newId) => {
    if (newId) {
      selectedDatasetId.value = Number(newId);
      await onDatasetChange();
    }
  }
);
</script>

<style scoped>
.quality-page {
  gap: var(--space-4);
}

.dataset-selector-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-4);
  flex-wrap: wrap;
}

.selector-label {
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
}

.empty-state {
  padding: var(--space-6) 0;
  display: flex;
  justify-content: center;
}

.error-state {
  padding: 0;
}

.progress-state {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-6) 0;
  justify-content: center;
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.progress-title {
  font-size: var(--text-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.progress-desc {
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.score-section {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--space-4);
}

.score-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-default);
  background: var(--surface-card);
  box-shadow: var(--shadow-sm);
}

.score-info {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.score-label {
  font-size: var(--text-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.score-meta {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.score-time {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-default);
  background: var(--surface-card);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: color-mix(in srgb, var(--app-accent) 35%, var(--border-default));
}

.stat-card--active {
  border-color: var(--app-accent);
  background: color-mix(in srgb, var(--app-accent) 6%, var(--surface-card));
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
  font-weight: 700;
}

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-name {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.issues-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.filter-group {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.selected-count {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}

.issues-table {
  margin-top: 0;
}

.text-muted {
  color: var(--text-tertiary);
}

.reinspect-bar {
  display: flex;
  justify-content: center;
  padding: var(--space-2) 0;
}

@media (max-width: 1023px) {
  .score-section {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 767px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .progress-state {
    flex-direction: column;
    text-align: center;
  }

  .issues-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .batch-actions {
    flex-wrap: wrap;
  }
}
</style>
