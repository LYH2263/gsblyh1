import apiClient from './client';
import type { Dataset } from '@/types/models';

export const datasetsApi = {
  list() {
    return apiClient.get<never, Dataset[]>('/datasets');
  },
  create(payload: { name: string; description?: string }) {
    return apiClient.post<never, Dataset>('/datasets', payload);
  },
  remove(datasetId: number) {
    return apiClient.delete<never, { id: number }>(`/datasets/${datasetId}`);
  }
};
