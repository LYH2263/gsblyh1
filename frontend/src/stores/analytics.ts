import { defineStore } from 'pinia';
import { analyticsApi, type AnalyticsFilters } from '@/api/analytics';
import type { RankItem, SummaryDTO, TrendPoint } from '@/types/models';

interface AnalyticsState {
  summary: SummaryDTO;
  trend: TrendPoint[];
  top: RankItem[];
  pie: RankItem[];
  loading: boolean;
}

const emptySummary: SummaryDTO = {
  totalAmount: 0,
  count: 0,
  avg: 0,
  compareValue: 0
};

export const useAnalyticsStore = defineStore('analytics', {
  state: (): AnalyticsState => ({
    summary: emptySummary,
    trend: [],
    top: [],
    pie: [],
    loading: false
  }),
  actions: {
    async fetchSummary(datasetId: number, filters: AnalyticsFilters) {
      this.summary = await analyticsApi.summary(datasetId, filters);
    },
    async fetchTrend(datasetId: number, filters: AnalyticsFilters) {
      this.trend = await analyticsApi.trend(datasetId, filters);
    },
    async fetchTop(
      datasetId: number,
      filters: AnalyticsFilters & {
        by?: 'category' | 'channel' | 'region';
        limit?: number;
      }
    ) {
      this.top = await analyticsApi.top(datasetId, filters);
    },
    async fetchPie(
      datasetId: number,
      filters: AnalyticsFilters & { by?: 'category' | 'channel' | 'region' }
    ) {
      this.pie = await analyticsApi.pie(datasetId, filters);
    },
    async fetchAll(
      datasetId: number,
      filters: AnalyticsFilters,
      options?: {
        topBy?: 'category' | 'channel' | 'region';
        pieBy?: 'category' | 'channel' | 'region';
      }
    ) {
      this.loading = true;
      try {
        const [summary, trend, top, pie] = await Promise.all([
          analyticsApi.summary(datasetId, filters),
          analyticsApi.trend(datasetId, filters),
          analyticsApi.top(datasetId, { ...filters, by: options?.topBy ?? 'category' }),
          analyticsApi.pie(datasetId, { ...filters, by: options?.pieBy ?? 'channel' })
        ]);

        this.summary = summary;
        this.trend = trend;
        this.top = top;
        this.pie = pie;
      } finally {
        this.loading = false;
      }
    }
  }
});
