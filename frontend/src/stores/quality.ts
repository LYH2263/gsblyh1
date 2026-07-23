import { defineStore } from 'pinia';
import { qualityApi } from '@/api/quality';
import type {
  InspectionReport,
  InspectionStatus,
  InspectionTask,
  IssueRule,
  PaginatedIssues,
  QualityIssue
} from '@/types/models';

interface QualityState {
  currentTask: InspectionTask | null;
  currentReport: InspectionReport | null;
  latestReport: InspectionReport | null;
  issues: QualityIssue[];
  issuesTotal: number;
  issuesPage: number;
  issuesPageSize: number;
  issuesRuleFilter: IssueRule | '';
  loading: boolean;
  polling: boolean;
  flaggedRecordIds: number[];
}

export const useQualityStore = defineStore('quality', {
  state: (): QualityState => ({
    currentTask: null,
    currentReport: null,
    latestReport: null,
    issues: [],
    issuesTotal: 0,
    issuesPage: 1,
    issuesPageSize: 10,
    issuesRuleFilter: '',
    loading: false,
    polling: false,
    flaggedRecordIds: []
  }),

  getters: {
    isRunning: (state): boolean => {
      return (
        state.currentTask?.status === 'queued' ||
        state.currentTask?.status === 'running'
      );
    },
    taskStatus: (state): InspectionStatus | null => state.currentTask?.status ?? null,
    hasIssues: (state): boolean => state.issuesTotal > 0,
    issueCountByRule(state): Record<IssueRule, number> {
      if (!state.currentReport) {
        return { missing: 0, abnormal_amount: 0, future_date: 0, duplicate: 0 };
      }
      return state.currentReport.issueCounts as Record<IssueRule, number>;
    }
  },

  actions: {
    resetTaskState() {
      this.currentTask = null;
      this.currentReport = null;
      this.issues = [];
      this.issuesTotal = 0;
      this.issuesPage = 1;
      this.issuesRuleFilter = '';
      this.polling = false;
    },

    async startInspection(datasetId: number) {
      this.resetTaskState();
      this.loading = true;
      try {
        const { taskId } = await qualityApi.startInspection(datasetId);
        await this.pollTask(taskId);
      } finally {
        this.loading = false;
      }
    },

    async pollTask(taskId: number) {
      this.polling = true;
      const maxAttempts = 60;
      const interval = 1000;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (!this.polling) break;

        try {
          const task = await qualityApi.getTask(taskId);
          this.currentTask = task;

          if (task.status === 'done') {
            this.polling = false;
            await this.fetchReport(taskId);
            return;
          }

          if (task.status === 'failed') {
            this.polling = false;
            return;
          }
        } catch {
          this.polling = false;
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, interval));
      }

      this.polling = false;
    },

    stopPolling() {
      this.polling = false;
    },

    async fetchReport(taskId: number) {
      const report = await qualityApi.getReport(taskId);
      this.currentReport = report;
      await this.fetchIssues(taskId, { page: 1 });
    },

    async fetchLatestReport(datasetId: number) {
      try {
        const report = await qualityApi.getLatestReport(datasetId);
        this.latestReport = report;
        if (report) {
          this.currentTask = {
            id: report.taskId,
            userId: report.userId,
            datasetId: report.datasetId,
            status: 'done',
            reportId: report.id,
            createdAt: report.createdAt,
            updatedAt: report.createdAt
          };
          this.currentReport = report;
          await this.fetchIssues(report.taskId, { page: 1 });
        }
      } catch {
        this.latestReport = null;
      }
    },

    async fetchIssues(
      taskId: number,
      opts: { page?: number; pageSize?: number; rule?: IssueRule | '' } = {}
    ) {
      if (opts.page) this.issuesPage = opts.page;
      if (opts.pageSize) this.issuesPageSize = opts.pageSize;
      if (opts.rule !== undefined) this.issuesRuleFilter = opts.rule;

      const result: PaginatedIssues = await qualityApi.getIssues(taskId, {
        rule: this.issuesRuleFilter || undefined,
        page: this.issuesPage,
        pageSize: this.issuesPageSize
      });
      this.issues = result.items;
      this.issuesTotal = result.total;
    },

    async changeRuleFilter(taskId: number, rule: IssueRule | '') {
      this.issuesRuleFilter = rule;
      await this.fetchIssues(taskId, { page: 1 });
    },

    async fixMissing(datasetId: number, recordIds: number[]) {
      const result = await qualityApi.fixMissing(datasetId, recordIds);
      return result.fixedCount;
    },

    async fixAmounts(datasetId: number, recordIds: number[]) {
      const result = await qualityApi.fixAmounts(datasetId, recordIds);
      return result.fixedCount;
    },

    async fixDuplicates(datasetId: number, recordIds: number[]) {
      const result = await qualityApi.fixDuplicates(datasetId, recordIds);
      return result.deletedCount;
    },

    async fetchFlaggedRecords(datasetId: number) {
      try {
        this.flaggedRecordIds = await qualityApi.getFlaggedRecords(datasetId);
      } catch {
        this.flaggedRecordIds = [];
      }
    }
  }
});
