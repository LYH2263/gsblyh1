import { defineStore } from 'pinia';
import { inspectionsApi, type FixMissingPayload } from '@/api/inspections';
import type {
  InspectionIssue,
  InspectionReport,
  InspectionStatus,
  IssueFilters,
  RuleKey
} from '@/types/models';

interface InspectionState {
  datasetId: number | null;
  taskId: number | null;
  status: InspectionStatus | null;
  taskError: string | null;
  report: InspectionReport | null;
  issues: InspectionIssue[];
  issueTotal: number;
  filters: IssueFilters;
  submitting: boolean;
  polling: boolean;
  loadingIssues: boolean;
  loadingReport: boolean;
}

const POLL_INTERVAL = 800;
const POLL_MAX_TRIES = 60;

const defaultFilters = (): IssueFilters => ({
  rule: undefined,
  page: 1,
  pageSize: 10
});

export const useInspectionStore = defineStore('inspections', {
  state: (): InspectionState => ({
    datasetId: null,
    taskId: null,
    status: null,
    taskError: null,
    report: null,
    issues: [],
    issueTotal: 0,
    filters: defaultFilters(),
    submitting: false,
    polling: false,
    loadingIssues: false,
    loadingReport: false
  }),
  getters: {
    isRunning: (state): boolean =>
      state.status === 'queued' || state.status === 'running',
    reportId: (state): number | null => state.report?.id ?? null,
    /** 最新报告中仍存在问题的 recordId 集合，用于探索页打标 */
    issueRecordIds: (state): Set<number> =>
      new Set(state.issues.map((issue) => issue.recordId))
  },
  actions: {
    reset(datasetId: number) {
      if (this.datasetId !== datasetId) {
        this.datasetId = datasetId;
        this.taskId = null;
        this.status = null;
        this.taskError = null;
        this.report = null;
        this.issues = [];
        this.issueTotal = 0;
        this.filters = defaultFilters();
      }
    },

    /** 载入数据集最新报告与问题明细 */
    async loadLatestReport(datasetId: number) {
      this.datasetId = datasetId;
      this.loadingReport = true;
      try {
        this.report = await inspectionsApi.getLatestReport(datasetId);
        if (this.report) {
          this.status = 'done';
          this.filters = defaultFilters();
          await this.fetchIssues();
        } else {
          this.issues = [];
          this.issueTotal = 0;
        }
      } finally {
        this.loadingReport = false;
      }
    },

    /** 发起巡检并轮询直到完成 */
    async startInspection(datasetId: number) {
      this.datasetId = datasetId;
      this.submitting = true;
      this.taskError = null;
      try {
        const { taskId, status } = await inspectionsApi.submit(datasetId);
        this.taskId = taskId;
        this.status = status;
      } finally {
        this.submitting = false;
      }
      await this.pollTask();
    },

    async pollTask() {
      if (!this.taskId) {
        return;
      }
      this.polling = true;
      try {
        for (let i = 0; i < POLL_MAX_TRIES; i += 1) {
          const task = await inspectionsApi.getTask(this.taskId);
          this.status = task.status;
          if (task.status === 'done') {
            this.taskError = null;
            if (this.datasetId) {
              await this.loadLatestReport(this.datasetId);
            }
            return;
          }
          if (task.status === 'failed') {
            this.taskError = task.error ?? '巡检执行失败';
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        }
        this.taskError = '巡检超时，请稍后重试';
      } finally {
        this.polling = false;
      }
    },

    async fetchIssues(payload: Partial<IssueFilters> = {}) {
      if (!this.report) {
        return;
      }
      this.filters = { ...this.filters, ...payload };
      this.loadingIssues = true;
      try {
        const result = await inspectionsApi.getIssues(this.report.id, {
          rule: this.filters.rule,
          page: this.filters.page,
          pageSize: this.filters.pageSize
        });
        this.issues = result.items;
        this.issueTotal = result.total;
      } finally {
        this.loadingIssues = false;
      }
    },

    async filterByRule(rule?: RuleKey) {
      await this.fetchIssues({ rule, page: 1 });
    },

    async fixMissing(payload: FixMissingPayload) {
      if (!this.report) return { affected: 0 };
      const result = await inspectionsApi.fixMissing(this.report.id, payload);
      return result;
    },

    async fixAmount(recordIds?: number[]) {
      if (!this.report) return { affected: 0 };
      return inspectionsApi.fixAmount(this.report.id, recordIds);
    },

    async fixDelete(recordIds: number[]) {
      if (!this.report) return { affected: 0 };
      return inspectionsApi.fixDelete(this.report.id, recordIds);
    }
  }
});
