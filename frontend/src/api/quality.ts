import apiClient from './client';
import type {
  PaginatedQualityIssues,
  QualityIssue,
  QualityReport,
  QualityTask,
  QualityWarnings
} from '@/types/models';

export interface IssueListParams {
  rule?: string;
  status?: 'open' | 'fixed';
  page?: number;
  pageSize?: number;
}

export const qualityApi = {
  startInspection(datasetId: number) {
    return apiClient.post<never, { taskId: number }>(
      `/datasets/${datasetId}/quality/tasks`,
      {}
    );
  },
  getTask(taskId: number) {
    return apiClient.get<never, QualityTask>(`/quality/tasks/${taskId}`);
  },
  getLatestReport(datasetId: number) {
    return apiClient.get<never, QualityReport | null>(
      `/datasets/${datasetId}/quality/reports/latest`
    );
  },
  getWarnings(datasetId: number) {
    return apiClient.get<never, QualityWarnings>(
      `/datasets/${datasetId}/quality/warnings`
    );
  },
  getReport(reportId: number) {
    return apiClient.get<never, QualityReport>(`/quality/reports/${reportId}`);
  },
  listIssues(reportId: number, params: IssueListParams = {}) {
    return apiClient.get<never, PaginatedQualityIssues>(
      `/quality/reports/${reportId}/issues`,
      { params }
    );
  },
  repairIssue(issueId: number, action: 'fill_default' | 'amount_abs', defaultValue?: string) {
    return apiClient.post<never, { id: number; status: string }>(
      `/quality/issues/${issueId}/repair`,
      { action, defaultValue }
    );
  },
  repairDuplicates(reportId: number, issueIds: number[]) {
    return apiClient.post<never, { fixedCount: number; deletedRecordIds: number[] }>(
      `/quality/reports/${reportId}/repair-duplicates`,
      { issueIds }
    );
  },
  repairBatch(reportId: number, rule: 'missing_field' | 'abnormal_amount') {
    return apiClient.post<never, { fixedCount: number }>(
      `/quality/reports/${reportId}/repair-batch/${rule}`,
      {}
    );
  }
};
