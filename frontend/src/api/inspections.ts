import apiClient from './client';
import type {
  InspectionReport,
  InspectionTask,
  IssueFilters,
  PaginatedIssues,
  SubmitInspectionResult
} from '@/types/models';

export interface FixMissingPayload {
  recordIds?: number[];
  category?: string;
  region?: string;
  channel?: string;
  date?: string;
}

export const inspectionsApi = {
  /** 发起巡检 / 复检 */
  submit(datasetId: number) {
    return apiClient.post<never, SubmitInspectionResult>(
      `/datasets/${datasetId}/inspections`
    );
  },
  /** 查询任务状态 */
  getTask(taskId: number) {
    return apiClient.get<never, InspectionTask>(
      `/inspections/tasks/${taskId}`
    );
  },
  /** 数据集最新报告，无则 null */
  getLatestReport(datasetId: number) {
    return apiClient.get<never, InspectionReport | null>(
      `/datasets/${datasetId}/inspections/latest`
    );
  },
  /** 报告问题明细（按规则筛选 + 分页） */
  getIssues(reportId: number, filters: Partial<IssueFilters>) {
    return apiClient.get<never, PaginatedIssues>(
      `/inspections/reports/${reportId}/issues`,
      { params: filters }
    );
  },
  /** 修复：缺失字段填默认值 */
  fixMissing(reportId: number, payload: FixMissingPayload) {
    return apiClient.post<never, { affected: number }>(
      `/inspections/reports/${reportId}/fix/missing`,
      payload
    );
  },
  /** 修复：异常金额改绝对值 */
  fixAmount(reportId: number, recordIds?: number[]) {
    return apiClient.post<never, { affected: number }>(
      `/inspections/reports/${reportId}/fix/amount`,
      { recordIds }
    );
  },
  /** 修复：重复记录批量删除 */
  fixDelete(reportId: number, recordIds: number[]) {
    return apiClient.post<never, { affected: number }>(
      `/inspections/reports/${reportId}/fix/delete`,
      { recordIds }
    );
  }
};
