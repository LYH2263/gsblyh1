<template>
  <div class="page-shell inspection-page">
    <SectionCard>
      <PageHeaderBar
        title="数据质量巡检与修复工作台"
        description="发起巡检 → 查看报告 → 按问题筛选 → 修复 → 复检，保障数据集质量。"
      >
        <template #actions>
          <div class="actions-group">
            <el-button @click="goExplore">数据探索</el-button>
            <el-button
              type="primary"
              :loading="store.submitting || store.polling"
              @click="runInspection"
            >
              {{ store.report ? '重新巡检 / 复检' : '发起巡检' }}
            </el-button>
          </div>
        </template>
      </PageHeaderBar>

      <!-- 任务进行中 -->
      <el-alert
        v-if="store.isRunning"
        class="state-block"
        :title="`巡检进行中（状态：${statusLabel}）`"
        type="info"
        :closable="false"
        show-icon
      >
        <el-progress :percentage="progressPercent" :status="'success'" :indeterminate="true" />
      </el-alert>

      <!-- 任务失败 -->
      <el-alert
        v-else-if="store.status === 'failed'"
        class="state-block"
        title="巡检失败"
        type="error"
        :closable="false"
        show-icon
      >
        {{ store.taskError || '巡检执行失败，请重试' }}
      </el-alert>

      <!-- 报告加载中 -->
      <el-skeleton v-else-if="store.loadingReport" class="state-block" :rows="4" animated />

      <!-- 无报告空态 -->
      <el-empty
        v-else-if="!store.report"
        class="state-block"
        description="该数据集尚未巡检，点击「发起巡检」开始检查数据质量"
      />

      <!-- 报告结果 -->
      <template v-else>
        <div class="report-summary">
          <div class="score-card" :class="scoreClass">
            <span class="score-label">质量分</span>
            <span class="score-value">{{ store.report.score }}</span>
            <span class="score-unit">/ 100</span>
          </div>
          <div class="summary-meta">
            <div class="meta-item">
              <span class="meta-label">记录总数</span>
              <span class="meta-value">{{ store.report.totalRecords }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">问题记录数</span>
              <span class="meta-value">{{ store.report.issueRecords }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">巡检时间</span>
              <span class="meta-value">{{ formatTime(store.report.createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- 分类统计 -->
        <div class="rule-stats">
          <button
            type="button"
            class="rule-chip"
            :class="{ 'rule-chip--active': !store.filters.rule }"
            @click="onFilterRule(undefined)"
          >
            <span class="chip-label">全部问题</span>
            <span class="chip-count">{{ totalIssueCount }}</span>
          </button>
          <button
            v-for="meta in RULE_METAS"
            :key="meta.key"
            type="button"
            class="rule-chip"
            :class="{ 'rule-chip--active': store.filters.rule === meta.key }"
            :title="meta.description"
            @click="onFilterRule(meta.key)"
          >
            <span class="chip-label">
              <el-tag :type="meta.tagType" size="small" effect="light">{{ meta.label }}</el-tag>
            </span>
            <span class="chip-count">{{ store.report.categoryCounts[meta.key] ?? 0 }}</span>
          </button>
        </div>

        <!-- 无问题空态 -->
        <el-result
          v-if="totalIssueCount === 0"
          class="state-block"
          icon="success"
          title="数据质量良好"
          sub-title="最新巡检未发现任何质量问题"
        />

        <!-- 问题表 -->
        <template v-else>
          <div class="table-actions">
            <span class="filter-hint">
              当前筛选：{{ store.filters.rule ? RULE_META_MAP[store.filters.rule].label : '全部问题' }}
            </span>
            <div class="actions-group">
              <el-button
                v-if="store.filters.rule === 'missing_field'"
                type="primary"
                @click="openMissingDialog"
              >
                填默认值修复本页
              </el-button>
              <el-button
                v-if="store.filters.rule === 'abnormal_amount'"
                type="primary"
                @click="fixAmountRows"
              >
                改绝对值修复本页
              </el-button>
              <el-button
                v-if="store.filters.rule === 'duplicate_key'"
                type="danger"
                :disabled="selectedIds.length === 0"
                @click="deleteSelected"
              >
                批量删除选中（{{ selectedIds.length }}）
              </el-button>
            </div>
          </div>

          <el-table
            ref="tableRef"
            class="issue-table"
            :data="store.issues"
            v-loading="store.loadingIssues"
            border
            @selection-change="onSelectionChange"
          >
            <el-table-column
              v-if="store.filters.rule === 'duplicate_key'"
              type="selection"
              width="48"
            />
            <el-table-column prop="recordId" label="记录 ID" width="96" />
            <el-table-column label="规则" width="128">
              <template #default="{ row }">
                <el-tag :type="ruleMeta(row).tagType" size="small" effect="light">
                  {{ ruleMeta(row).label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="summary" label="问题摘要" min-width="240" />
            <el-table-column label="日期" width="120">
              <template #default="{ row }">{{ row.record?.date || '—' }}</template>
            </el-table-column>
            <el-table-column label="分类" min-width="100">
              <template #default="{ row }">{{ row.record?.category || '—' }}</template>
            </el-table-column>
            <el-table-column label="地区" min-width="100">
              <template #default="{ row }">{{ row.record?.region || '—' }}</template>
            </el-table-column>
            <el-table-column label="渠道" min-width="100">
              <template #default="{ row }">{{ row.record?.channel || '—' }}</template>
            </el-table-column>
            <el-table-column label="金额" min-width="110">
              <template #default="{ row }">{{ row.record?.amount ?? '—' }}</template>
            </el-table-column>
          </el-table>

          <div class="table-toolbar">
            <el-pagination
              background
              layout="prev, pager, next, sizes, total"
              :current-page="store.filters.page"
              :page-size="store.filters.pageSize"
              :total="store.issueTotal"
              :page-sizes="[10, 20, 50]"
              @current-change="onPageChange"
              @size-change="onSizeChange"
            />
          </div>
        </template>
      </template>
    </SectionCard>

    <!-- 缺失字段填默认值对话框 -->
    <el-dialog v-model="missingDialogVisible" title="缺失字段填默认值" width="420px">
      <p class="dialog-tip">仅填充为空的字段；留空则使用系统默认值。</p>
      <el-form :model="missingForm" label-position="top">
        <el-form-item label="分类默认值">
          <el-input v-model="missingForm.category" placeholder="默认：未分类" />
        </el-form-item>
        <el-form-item label="地区默认值">
          <el-input v-model="missingForm.region" placeholder="默认：未知地区" />
        </el-form-item>
        <el-form-item label="渠道默认值">
          <el-input v-model="missingForm.channel" placeholder="默认：未知渠道" />
        </el-form-item>
        <el-form-item label="日期默认值">
          <el-date-picker
            v-model="missingForm.date"
            class="full-width"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="默认：今天"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="actions-group dialog-footer-actions">
          <el-button @click="missingDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmMissing">确认修复</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { TableInstance } from 'element-plus';
import { useRoute, useRouter } from 'vue-router';
import PageHeaderBar from '@/components/ui/PageHeaderBar.vue';
import SectionCard from '@/components/ui/SectionCard.vue';
import { useInspectionStore } from '@/stores/inspections';
import { RULE_METAS, RULE_META_MAP } from '@/config/inspectionRules';
import type { InspectionIssue, RuleKey } from '@/types/models';

const route = useRoute();
const router = useRouter();
const store = useInspectionStore();

const datasetId = computed(() => Number(route.params.id));

const tableRef = ref<TableInstance>();
const selectedIds = ref<number[]>([]);

const missingDialogVisible = ref(false);
const missingForm = reactive({
  category: '',
  region: '',
  channel: '',
  date: ''
});

const statusLabelMap: Record<string, string> = {
  queued: '排队中',
  running: '执行中',
  done: '已完成',
  failed: '失败'
};

const statusLabel = computed(() =>
  store.status ? statusLabelMap[store.status] ?? store.status : '—'
);

const progressPercent = computed(() => (store.status === 'running' ? 70 : 30));

const totalIssueCount = computed(() => {
  if (!store.report) return 0;
  return Object.values(store.report.categoryCounts).reduce((sum, n) => sum + n, 0);
});

const scoreClass = computed(() => {
  const score = store.report?.score ?? 0;
  if (score >= 90) return 'score-card--good';
  if (score >= 60) return 'score-card--warn';
  return 'score-card--bad';
});

const formatTime = (iso: string) => new Date(iso).toLocaleString();

const ruleMeta = (row: InspectionIssue) => RULE_META_MAP[row.rule];

onMounted(async () => {
  store.reset(datasetId.value);
  await store.loadLatestReport(datasetId.value);
});

watch(datasetId, async (id) => {
  store.reset(id);
  await store.loadLatestReport(id);
});

const runInspection = async () => {
  await store.startInspection(datasetId.value);
  if (store.status === 'failed') {
    ElMessage.error(store.taskError || '巡检失败');
  } else {
    ElMessage.success('巡检完成');
  }
};

const onFilterRule = async (rule?: RuleKey) => {
  selectedIds.value = [];
  await store.filterByRule(rule);
};

const onPageChange = async (page: number) => {
  await store.fetchIssues({ page });
};

const onSizeChange = async (pageSize: number) => {
  await store.fetchIssues({ page: 1, pageSize });
};

const onSelectionChange = (rows: InspectionIssue[]) => {
  selectedIds.value = rows.map((row) => row.recordId);
};

const openMissingDialog = () => {
  missingForm.category = '';
  missingForm.region = '';
  missingForm.channel = '';
  missingForm.date = '';
  missingDialogVisible.value = true;
};

const currentPageRecordIds = computed(() =>
  store.issues.map((issue) => issue.recordId)
);

const confirmMissing = async () => {
  const result = await store.fixMissing({
    recordIds: currentPageRecordIds.value,
    category: missingForm.category || undefined,
    region: missingForm.region || undefined,
    channel: missingForm.channel || undefined,
    date: missingForm.date || undefined
  });
  missingDialogVisible.value = false;
  ElMessage.success(`已修复 ${result.affected} 条记录，请复检确认`);
};

const fixAmountRows = async () => {
  const result = await store.fixAmount(currentPageRecordIds.value);
  ElMessage.success(`已修复 ${result.affected} 条记录，请复检确认`);
};

const deleteSelected = async () => {
  if (selectedIds.value.length === 0) return;
  try {
    await ElMessageBox.confirm(
      `确认删除选中的 ${selectedIds.value.length} 条重复记录？此操作不可恢复。`,
      '批量删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    );
  } catch {
    return;
  }
  const result = await store.fixDelete(selectedIds.value);
  selectedIds.value = [];
  ElMessage.success(`已删除 ${result.affected} 条记录，请复检确认`);
};

const goExplore = () => {
  router.push(`/app/datasets/${datasetId.value}/explore`);
};
</script>

<style scoped>
.state-block {
  margin-top: var(--space-4);
}

.report-summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
  align-items: center;
  margin-top: var(--space-4);
}

.score-card {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-md);
  color: #fff;
}

.score-card--good {
  background: linear-gradient(135deg, #16a34a, #22c55e);
}

.score-card--warn {
  background: linear-gradient(135deg, #d97706, #f59e0b);
}

.score-card--bad {
  background: linear-gradient(135deg, #dc2626, #ef4444);
}

.score-label {
  font-size: var(--text-sm);
  align-self: flex-start;
  margin-right: var(--space-2);
}

.score-value {
  font-size: 44px;
  font-weight: var(--font-weight-semibold);
  line-height: 1;
}

.score-unit {
  font-size: var(--text-sm);
  opacity: 0.85;
}

.summary-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.meta-value {
  font-size: var(--text-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.rule-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-5);
}

.rule-chip {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-default);
  background: var(--surface-card);
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.rule-chip:hover {
  border-color: color-mix(in srgb, var(--app-accent) 40%, var(--border-default));
}

.rule-chip--active {
  border-color: var(--app-accent);
  background: color-mix(in srgb, var(--app-accent) 12%, var(--surface-card));
}

.chip-label {
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.chip-count {
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.table-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-5);
  flex-wrap: wrap;
}

.filter-hint {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.issue-table {
  margin-top: var(--space-3);
}

.dialog-tip {
  margin-bottom: var(--space-3);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.dialog-footer-actions {
  justify-content: flex-end;
}
</style>
