import apiClient from './client';
import type {
  InspectionReport,
  InspectionTask,
  PaginatedIssues
} from '@/types/models';

export const qualityApi = {
  startInspection(datasetId: number) {
    return apiClient.post<never, { taskId: number }>(
      `/quality/datasets/${datasetId}/inspections`
    );
  },

  getTask(taskId: number) {
    return apiClient.get<never, InspectionTask>(`/quality/inspections/${taskId}`);
  },

  getReport(taskId: number) {
    return apiClient.get<never, InspectionReport>(
      `/quality/inspections/${taskId}/report`
    );
  },

  getIssues(
    taskId: number,
    params: { rule?: string; page?: number; pageSize?: number }
  ) {
    return apiClient.get<never, PaginatedIssues>(
      `/quality/inspections/${taskId}/issues`,
      { params }
    );
  },

  getLatestReport(datasetId: number) {
    return apiClient.get<never, InspectionReport | null>(
      `/quality/datasets/${datasetId}/reports/latest`
    );
  },

  getFlaggedRecords(datasetId: number) {
    return apiClient.get<never, number[]>(
      `/quality/datasets/${datasetId}/flagged-records`
    );
  },

  fixMissing(datasetId: number, recordIds: number[]) {
    return apiClient.post<never, { fixedCount: number }>(
      `/quality/datasets/${datasetId}/fix/missing`,
      { recordIds }
    );
  },

  fixAmounts(datasetId: number, recordIds: number[]) {
    return apiClient.post<never, { fixedCount: number }>(
      `/quality/datasets/${datasetId}/fix/amounts`,
      { recordIds }
    );
  },

  fixDuplicates(datasetId: number, recordIds: number[]) {
    return apiClient.post<never, { deletedCount: number }>(
      `/quality/datasets/${datasetId}/fix/duplicates`,
      { recordIds }
    );
  }
};
