import apiClient from './client';
import type { RankItem, SummaryDTO, TrendPoint } from '@/types/models';

export interface AnalyticsFilters {
  from?: string;
  to?: string;
  category?: string;
  region?: string;
  channel?: string;
}

export const analyticsApi = {
  summary(datasetId: number, filters: AnalyticsFilters) {
    return apiClient.get<never, SummaryDTO>(`/datasets/${datasetId}/analytics/summary`, {
      params: filters
    });
  },
  trend(datasetId: number, filters: AnalyticsFilters) {
    return apiClient.get<never, TrendPoint[]>(`/datasets/${datasetId}/analytics/trend`, {
      params: { ...filters, granularity: 'day' }
    });
  },
  top(
    datasetId: number,
    filters: AnalyticsFilters & { by?: 'category' | 'channel' | 'region'; limit?: number }
  ) {
    return apiClient.get<never, RankItem[]>(`/datasets/${datasetId}/analytics/top`, {
      params: { ...filters, by: filters.by ?? 'category', limit: filters.limit ?? 10 }
    });
  },
  pie(
    datasetId: number,
    filters: AnalyticsFilters & { by?: 'category' | 'channel' | 'region' }
  ) {
    return apiClient.get<never, RankItem[]>(`/datasets/${datasetId}/analytics/pie`, {
      params: { ...filters, by: filters.by ?? 'channel' }
    });
  }
};
