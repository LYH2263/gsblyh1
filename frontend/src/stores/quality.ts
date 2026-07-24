import { defineStore } from 'pinia';
import { qualityApi } from '@/api/quality';
import type {
  QualityIssue,
  QualityReport,
  QualityRule,
  QualityTask
} from '@/types/models';

interface QualityState {
  task: QualityTask | null;
  report: QualityReport | null;
  issues: QualityIssue[];
  issuesTotal: number;
  issuesPage: number;
  issuesPageSize: number;
  ruleFilter: QualityRule | 'all';
  statusFilter: 'all' | 'open' | 'fixed';
  loading: boolean;
  issuesLoading: boolean;
  polling: boolean;
  error: string | null;
  selectedIssueIds: number[];
  repairing: boolean;
}

const POLL_INTERVAL_MS = 1200;

export const useQualityStore = defineStore('quality', {
  state: (): QualityState => ({
    task: null,
    report: null,
    issues: [],
    issuesTotal: 0,
    issuesPage: 1,
    issuesPageSize: 10,
    ruleFilter: 'all',
    statusFilter: 'open',
    loading: false,
    issuesLoading: false,
    polling: false,
    error: null,
    selectedIssueIds: [],
    repairing: false
  }),
  getters: {
    isRunning: (state): boolean =>
      state.task?.status === 'queued' || state.task?.status === 'running',
    isDone: (state): boolean => state.task?.status === 'done',
    isFailed: (state): boolean => state.task?.status === 'failed',
    hasReport: (state): boolean => state.report !== null,
    categoryStats: (state) => {
      if (!state.report) {
        return {
          missing: 0,
          abnormalAmount: 0,
          futureDate: 0,
          duplicate: 0
        };
      }
      return {
        missing: state.report.countMissing,
        abnormalAmount: state.report.countAbnormalAmount,
        futureDate: state.report.countFutureDate,
        duplicate: state.report.countDuplicate
      };
    },
    totalIssues: (state): number => {
      if (!state.report) {
        return 0;
      }
      return (
        state.report.countMissing +
        state.report.countAbnormalAmount +
        state.report.countFutureDate +
        state.report.countDuplicate
      );
    },
    selectedDuplicateIssues: (state): QualityIssue[] =>
      state.issues.filter(
        (item) =>
          item.rule === 'duplicate_key' &&
          item.status === 'open' &&
          state.selectedIssueIds.includes(item.id)
      )
  },
  actions: {
    resetState() {
      this.task = null;
      this.report = null;
      this.issues = [];
      this.issuesTotal = 0;
      this.issuesPage = 1;
      this.ruleFilter = 'all';
      this.statusFilter = 'open';
      this.loading = false;
      this.issuesLoading = false;
      this.polling = false;
      this.error = null;
      this.selectedIssueIds = [];
      this.repairing = false;
    },

    async loadLatestReport(datasetId: number) {
      this.loading = true;
      this.error = null;
      try {
        const report = await qualityApi.getLatestReport(datasetId);
        this.report = report;
        if (report) {
          this.issuesPage = 1;
          await this.fetchIssues();
        } else {
          this.issues = [];
          this.issuesTotal = 0;
        }
      } catch (err) {
        this.error = err instanceof Error ? err.message : '加载报告失败';
      } finally {
        this.loading = false;
      }
    },

    async startInspection(datasetId: number) {
      this.error = null;
      this.loading = true;
      this.polling = false;
      try {
        const { taskId } = await qualityApi.startInspection(datasetId);
        this.task = await qualityApi.getTask(taskId);
        this.report = null;
        this.issues = [];
        this.issuesTotal = 0;
        this.selectedIssueIds = [];
        await this.pollTask(taskId);
      } catch (err) {
        this.error = err instanceof Error ? err.message : '发起巡检失败';
        this.loading = false;
      }
    },

    async pollTask(taskId: number) {
      this.polling = true;
      const poll = async (): Promise<void> => {
        const task = await qualityApi.getTask(taskId);
        this.task = task;

        if (task.status === 'done') {
          this.polling = false;
          if (task.reportId) {
            this.report = await qualityApi.getReport(task.reportId);
            this.issuesPage = 1;
            this.ruleFilter = 'all';
            this.statusFilter = 'open';
            await this.fetchIssues();
          }
          this.loading = false;
          return;
        }

        if (task.status === 'failed') {
          this.polling = false;
          this.error = task.error || '巡检执行失败';
          this.loading = false;
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        await poll();
      };

      try {
        await poll();
      } catch (err) {
        this.polling = false;
        this.loading = false;
        this.error = err instanceof Error ? err.message : '轮询任务状态失败';
      }
    },

    async fetchIssues() {
      if (!this.report) {
        return;
      }
      this.issuesLoading = true;
      try {
        const result = await qualityApi.listIssues(this.report.id, {
          rule: this.ruleFilter === 'all' ? undefined : this.ruleFilter,
          status: this.statusFilter === 'all' ? undefined : this.statusFilter,
          page: this.issuesPage,
          pageSize: this.issuesPageSize
        });
        this.issues = result.items;
        this.issuesTotal = result.total;
      } catch (err) {
        this.error = err instanceof Error ? err.message : '加载问题明细失败';
      } finally {
        this.issuesLoading = false;
      }
    },

    async changeRuleFilter(rule: QualityRule | 'all') {
      this.ruleFilter = rule;
      this.issuesPage = 1;
      this.selectedIssueIds = [];
      await this.fetchIssues();
    },

    async changeStatusFilter(status: 'all' | 'open' | 'fixed') {
      this.statusFilter = status;
      this.issuesPage = 1;
      this.selectedIssueIds = [];
      await this.fetchIssues();
    },

    async changePage(page: number) {
      this.issuesPage = page;
      this.selectedIssueIds = [];
      await this.fetchIssues();
    },

    async changePageSize(pageSize: number) {
      this.issuesPageSize = pageSize;
      this.issuesPage = 1;
      this.selectedIssueIds = [];
      await this.fetchIssues();
    },

    toggleSelect(issueId: number, checked: boolean) {
      if (checked) {
        if (!this.selectedIssueIds.includes(issueId)) {
          this.selectedIssueIds.push(issueId);
        }
      } else {
        this.selectedIssueIds = this.selectedIssueIds.filter((id) => id !== issueId);
      }
    },

    toggleSelectAllOnPage(checked: boolean) {
      const pageDuplicateIds = this.issues
        .filter((item) => item.rule === 'duplicate_key' && item.status === 'open')
        .map((item) => item.id);
      if (checked) {
        const merged = new Set([...this.selectedIssueIds, ...pageDuplicateIds]);
        this.selectedIssueIds = Array.from(merged);
      } else {
        this.selectedIssueIds = this.selectedIssueIds.filter(
          (id) => !pageDuplicateIds.includes(id)
        );
      }
    },

    async repairMissing(issueId: number, defaultValue?: string) {
      this.repairing = true;
      try {
        await qualityApi.repairIssue(issueId, 'fill_default', defaultValue);
        await this.fetchIssues();
      } finally {
        this.repairing = false;
      }
    },

    async repairAbnormalAmount(issueId: number) {
      this.repairing = true;
      try {
        await qualityApi.repairIssue(issueId, 'amount_abs');
        await this.fetchIssues();
      } finally {
        this.repairing = false;
      }
    },

    async batchRepairMissing() {
      if (!this.report) {
        return;
      }
      this.repairing = true;
      try {
        await qualityApi.repairBatch(this.report.id, 'missing_field');
        await this.fetchIssues();
      } finally {
        this.repairing = false;
      }
    },

    async batchRepairAbnormalAmount() {
      if (!this.report) {
        return;
      }
      this.repairing = true;
      try {
        await qualityApi.repairBatch(this.report.id, 'abnormal_amount');
        await this.fetchIssues();
      } finally {
        this.repairing = false;
      }
    },

    async deleteSelectedDuplicates(): Promise<number> {
      if (!this.report || this.selectedIssueIds.length === 0) {
        return 0;
      }
      this.repairing = true;
      try {
        const result = await qualityApi.repairDuplicates(
          this.report.id,
          this.selectedIssueIds
        );
        this.selectedIssueIds = [];
        await this.fetchIssues();
        return result.fixedCount;
      } finally {
        this.repairing = false;
      }
    },

    async reInspect(datasetId: number) {
      await this.startInspection(datasetId);
    }
  }
});
