import apiClient from './client';
import type {
  PaginatedRecords,
  RecordFilters,
  RecordItem
} from '@/types/models';

export const recordsApi = {
  list(datasetId: number, filters: Partial<RecordFilters>) {
    return apiClient.get<never, PaginatedRecords>(`/datasets/${datasetId}/records`, {
      params: filters
    });
  },
  create(
    datasetId: number,
    payload: Omit<RecordItem, 'id' | 'datasetId'>
  ) {
    return apiClient.post<never, RecordItem>(`/datasets/${datasetId}/records`, payload);
  },
  bulkImport(datasetId: number, csvText: string, lenient = false) {
    return apiClient.post<never, { insertedCount: number }>(
      `/datasets/${datasetId}/records/bulk`,
      {
        csvText,
        lenient
      }
    );
  },
  remove(recordId: number) {
    return apiClient.delete<never, { id: number }>(`/records/${recordId}`);
  }
};
